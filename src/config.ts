import { access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { appError } from './errors.js';

const require = createRequire(import.meta.url);

const CONFIG_FILES = [
  'i18n-smell.config.mjs',
  'i18n-smell.config.cjs',
  'i18n-smell.config.js',
  'i18n-smell.config.json',
];

const DEFAULT_PLACEHOLDER_PATTERNS = [
  String.raw`\{\{[^}]+\}\}`,
  String.raw`(?<!\{)\{[^{}]+\}(?!\})`,
  String.raw`%[sdif]`,
  String.raw`%\([^)]+\)[sdif]`,
  String.raw`\$\d+`,
];

const DEFAULT_HARDCODED_ATTRIBUTES = ['placeholder', 'title', 'alt', 'aria-label', 'aria-description'];

const DEFAULT_HARDCODED_FUNCTIONS = ['alert', 'confirm', 'toast.success', 'toast.error'];

const DEFAULT_SOURCE_GLOBS = ['src/**/*.{vue,js,jsx,ts,tsx}'];

const FAIL_ON_LEVELS = ['none', 'low', 'medium', 'high'];
const BOOLEAN_OPTIONS = [
  'ignoreSameLanguageFamily',
  'trimWhitespace',
  'ignoreCase',
  'includeIgnored',
  'ignoreCodeLike',
];
const CHECK_NAMES = ['identical', 'hardcoded', 'placeholders'];
const PRESETS = ['recommended', 'strict'];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveConfigPath(explicitPath, cwd) {
  if (explicitPath) {
    const absolute = path.isAbsolute(explicitPath) ? explicitPath : path.resolve(cwd, explicitPath);
    if (!(await exists(absolute))) throw appError(`Config file not found: ${absolute}`, 'CONFIG_NOT_FOUND');
    return absolute;
  }

  for (const file of CONFIG_FILES) {
    const absolute = path.resolve(cwd, file);
    if (await exists(absolute)) return absolute;
  }

  throw appError(`Config file not found. Expected one of: ${CONFIG_FILES.join(', ')}`, 'CONFIG_NOT_FOUND');
}

export async function loadConfig(configPath) {
  let loaded;

  if (configPath.endsWith('.json') || configPath.endsWith('.cjs')) {
    loaded = require(configPath);
  } else {
    loaded = await import(pathToFileURL(configPath).href);
  }

  const config = loaded.default || loaded;
  validateConfig(config);
  return withDefaults(config);
}

function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw appError('Config must export an object', 'CONFIG_INVALID');
  }

  const candidate = /** @type {Record<string, unknown>} */ config;
  if ('baseLocale' in candidate && (typeof candidate.baseLocale !== 'string' || !candidate.baseLocale)) {
    throw appError('Config baseLocale must be a non-empty string', 'CONFIG_INVALID');
  }

  if (
    'locales' in candidate &&
    (!candidate.locales || typeof candidate.locales !== 'object' || Array.isArray(candidate.locales))
  ) {
    throw appError('Config locales must be an object', 'CONFIG_INVALID');
  }

  for (const [locale, value] of Object.entries(candidate.locales || {})) {
    if (typeof value !== 'string' || !value) {
      throw appError(`Config locales.${locale} must be a file path string`, 'CONFIG_INVALID');
    }
  }

  validateRuleList(candidate.allowIdenticalKeys, 'allowIdenticalKeys');
  validateRuleList(candidate.allowIdenticalValues, 'allowIdenticalValues');

  if ('placeholderPatterns' in candidate && !Array.isArray(candidate.placeholderPatterns)) {
    throw appError('Config placeholderPatterns must be an array of strings or RegExp objects', 'CONFIG_INVALID');
  }

  if ('source' in candidate && !isStringArray(candidate.source)) {
    throw appError('Config source must be an array of glob strings', 'CONFIG_INVALID');
  }

  if (
    'hardcoded' in candidate &&
    (!candidate.hardcoded || typeof candidate.hardcoded !== 'object' || Array.isArray(candidate.hardcoded))
  ) {
    throw appError('Config hardcoded must be an object', 'CONFIG_INVALID');
  }

  if (
    'checks' in candidate &&
    (!candidate.checks || typeof candidate.checks !== 'object' || Array.isArray(candidate.checks))
  ) {
    throw appError('Config checks must be an object', 'CONFIG_INVALID');
  }

  if ('preset' in candidate && (typeof candidate.preset !== 'string' || !PRESETS.includes(candidate.preset))) {
    throw appError('Config preset must be recommended or strict', 'CONFIG_INVALID');
  }

  const checks = /** @type {Record<string, unknown>} */ candidate.checks || {};
  for (const check of CHECK_NAMES) {
    if (check in checks && typeof checks[check] !== 'boolean') {
      throw appError(`Config checks.${check} must be a boolean`, 'CONFIG_INVALID');
    }
  }

  if (
    'format' in candidate &&
    (typeof candidate.format !== 'string' ||
      !['console', 'json', 'markdown', 'sarif', 'html'].includes(candidate.format))
  ) {
    throw appError('Config format must be console, json, markdown, sarif, or html', 'CONFIG_INVALID');
  }

  if ('failOn' in candidate && (typeof candidate.failOn !== 'string' || !FAIL_ON_LEVELS.includes(candidate.failOn))) {
    throw appError('Config failOn must be high, medium, low, or none', 'CONFIG_INVALID');
  }

  for (const option of BOOLEAN_OPTIONS) {
    if (option in candidate && typeof candidate[option] !== 'boolean') {
      throw appError(`Config ${option} must be a boolean`, 'CONFIG_INVALID');
    }
  }

  if ('output' in candidate && typeof candidate.output !== 'string') {
    throw appError('Config output must be a file path string', 'CONFIG_INVALID');
  }

  if ('baseline' in candidate && typeof candidate.baseline !== 'string') {
    throw appError('Config baseline must be a file path string', 'CONFIG_INVALID');
  }

  const hardcoded = /** @type {Record<string, unknown>} */ candidate.hardcoded || {};
  if ('vueAttributes' in hardcoded && !isStringArray(hardcoded.vueAttributes)) {
    throw appError('Config hardcoded.vueAttributes must be an array of strings', 'CONFIG_INVALID');
  }
  if ('jsxAttributes' in hardcoded && !isStringArray(hardcoded.jsxAttributes)) {
    throw appError('Config hardcoded.jsxAttributes must be an array of strings', 'CONFIG_INVALID');
  }
  if ('functions' in hardcoded && !isStringArray(hardcoded.functions)) {
    throw appError('Config hardcoded.functions must be an array of strings', 'CONFIG_INVALID');
  }
  if ('ignoreFiles' in hardcoded && !isStringArray(hardcoded.ignoreFiles)) {
    throw appError('Config hardcoded.ignoreFiles must be an array of glob strings', 'CONFIG_INVALID');
  }
  validateRuleList(hardcoded.ignoreValues, 'hardcoded.ignoreValues');
  validateRuleList(hardcoded.ignorePatterns, 'hardcoded.ignorePatterns');
}

/**
 * @param {import('./types.js').DetectorConfigInput} config
 * @returns {import('./types.js').DetectorConfig}
 */
function withDefaults(config) {
  const { checks, source, hardcoded, placeholderPatterns, ignoreCodeLike, preset, ...rest } = config;
  const presetDefaults =
    preset === 'strict'
      ? { ignoreSameLanguageFamily: false, failOn: 'medium' }
      : { ignoreSameLanguageFamily: true, failOn: 'high' };

  return {
    baseLocale: 'en',
    locales: {},
    allowIdenticalKeys: [],
    allowIdenticalValues: [],
    ignoreSameLanguageFamily: presetDefaults.ignoreSameLanguageFamily,
    trimWhitespace: true,
    ignoreCase: false,
    includeIgnored: false,
    failOn: presetDefaults.failOn,
    ...rest,
    checks: {
      identical: true,
      hardcoded: true,
      placeholders: true,
      ...(checks || {}),
    },
    source: source || DEFAULT_SOURCE_GLOBS,
    hardcoded: normalizeHardcodedConfig(hardcoded || {}),
    placeholderPatterns: normalizePlaceholderPatterns(placeholderPatterns || DEFAULT_PLACEHOLDER_PATTERNS),
    ignoreCodeLike: ignoreCodeLike ?? true,
  };
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

function validateRuleList(rules, name) {
  if (rules === undefined) return;
  if (!Array.isArray(rules)) throw appError(`Config ${name} must be an array`, 'CONFIG_INVALID');

  for (const rule of rules) {
    if (typeof rule !== 'string' && !(rule instanceof RegExp)) {
      throw appError(`Config ${name} entries must be strings or RegExp objects`, 'CONFIG_INVALID');
    }
  }
}

function normalizePlaceholderPatterns(patterns) {
  return patterns
    .map((pattern) => {
      if (pattern instanceof RegExp) return withGlobalFlag(pattern);

      if (typeof pattern !== 'string') {
        throw appError('Config placeholderPatterns entries must be strings or RegExp objects', 'CONFIG_INVALID');
      }

      try {
        return new RegExp(pattern, 'g');
      } catch (error) {
        throw appError(`Invalid placeholder pattern "${pattern}": ${error.message}`, 'CONFIG_INVALID');
      }
    })
    .sort((a, b) => b.source.length - a.source.length);
}

function normalizeHardcodedConfig(config) {
  return {
    vueAttributes: config.vueAttributes || DEFAULT_HARDCODED_ATTRIBUTES,
    jsxAttributes: config.jsxAttributes || DEFAULT_HARDCODED_ATTRIBUTES,
    functions: config.functions || DEFAULT_HARDCODED_FUNCTIONS,
    ignoreFiles: config.ignoreFiles || [],
    ignoreValues: config.ignoreValues || [],
    ignorePatterns: normalizeRegexRules(config.ignorePatterns || [], 'hardcoded.ignorePatterns'),
  };
}

function normalizeRegexRules(rules, name) {
  return rules.map((rule) => {
    if (rule instanceof RegExp) return rule;
    if (typeof rule !== 'string') {
      throw appError(`Config ${name} entries must be strings or RegExp objects`, 'CONFIG_INVALID');
    }

    try {
      return new RegExp(rule);
    } catch (error) {
      throw appError(`Invalid ${name} pattern "${rule}": ${error.message}`, 'CONFIG_INVALID');
    }
  });
}

function withGlobalFlag(pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}
