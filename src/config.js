import { access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const CONFIG_FILES = [
  'i18n-smell.config.mjs',
  'i18n-smell.config.cjs',
  'i18n-smell.config.js',
  'i18n-smell.config.json',
];

const DEFAULT_PLACEHOLDER_PATTERNS = [
  String.raw`\{\{[^}]+\}\}`,
  String.raw`\{[^}]+\}`,
];

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
    if (!(await exists(absolute))) throw new Error(`Config file not found: ${absolute}`);
    return absolute;
  }

  for (const file of CONFIG_FILES) {
    const absolute = path.resolve(cwd, file);
    if (await exists(absolute)) return absolute;
  }

  throw new Error(`Config file not found. Expected one of: ${CONFIG_FILES.join(', ')}`);
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
    throw new Error('Config must export an object');
  }

  const candidate = /** @type {Record<string, unknown>} */ (config);
  if ('baseLocale' in candidate && (typeof candidate.baseLocale !== 'string' || !candidate.baseLocale)) {
    throw new Error('Config baseLocale must be a non-empty string');
  }

  if ('locales' in candidate && (!candidate.locales || typeof candidate.locales !== 'object' || Array.isArray(candidate.locales))) {
    throw new Error('Config locales must be an object');
  }

  for (const [locale, value] of Object.entries(candidate.locales || {})) {
    if (typeof value !== 'string' || !value) {
      throw new Error(`Config locales.${locale} must be a file path string`);
    }
  }

  validateRuleList(candidate.allowIdenticalKeys, 'allowIdenticalKeys');
  validateRuleList(candidate.allowIdenticalValues, 'allowIdenticalValues');

  if ('placeholderPatterns' in candidate && !Array.isArray(candidate.placeholderPatterns)) {
    throw new Error('Config placeholderPatterns must be an array of strings or RegExp objects');
  }
}

/** @param {import('./types.js').DetectorConfig} config */
function withDefaults(config) {
  return {
    baseLocale: 'en',
    locales: {},
    allowIdenticalKeys: [],
    allowIdenticalValues: [],
    ignoreSameLanguageFamily: true,
    trimWhitespace: true,
    ignoreCase: false,
    includeIgnored: false,
    failOn: 'high',
    ...config,
    placeholderPatterns: normalizePlaceholderPatterns(config.placeholderPatterns || DEFAULT_PLACEHOLDER_PATTERNS),
    ignoreCodeLike: config.ignoreCodeLike ?? true,
  };
}

function validateRuleList(rules, name) {
  if (rules === undefined) return;
  if (!Array.isArray(rules)) throw new Error(`Config ${name} must be an array`);

  for (const rule of rules) {
    if (typeof rule !== 'string' && !(rule instanceof RegExp)) {
      throw new Error(`Config ${name} entries must be strings or RegExp objects`);
    }
  }
}

function normalizePlaceholderPatterns(patterns) {
  return patterns.map((pattern) => {
    if (pattern instanceof RegExp) return withGlobalFlag(pattern);

    if (typeof pattern !== 'string') {
      throw new Error('Config placeholderPatterns entries must be strings or RegExp objects');
    }

    try {
      return new RegExp(pattern, 'g');
    } catch (error) {
      throw new Error(`Invalid placeholder pattern "${pattern}": ${error.message}`);
    }
  });
}

function withGlobalFlag(pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}
