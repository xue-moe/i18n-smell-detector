import { access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { appError } from './errors.js';
import type {
  DetectorConfig,
  DetectorConfigInput,
  FailOnLevel,
  HardcodedConfig,
  HardcodedConfigInput,
  Rule,
} from './types.js';

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
];

const DEFAULT_HARDCODED_ATTRIBUTES = ['placeholder', 'title', 'alt', 'aria-label', 'aria-description'];

const DEFAULT_HARDCODED_FUNCTIONS = ['alert', 'confirm', 'toast.success', 'toast.error'];

const DEFAULT_SOURCE_GLOBS = ['src/**/*.{vue,js,jsx,ts,tsx}'];

const FAIL_ON_LEVELS = ['none', 'low', 'medium', 'high'] as const;
const BOOLEAN_OPTIONS = [
  'ignoreSameLanguageFamily',
  'trimWhitespace',
  'ignoreCase',
  'includeIgnored',
  'ignoreCodeLike',
];
const CHECK_NAMES = ['identical', 'hardcoded', 'placeholders'] as const;
const REPORT_FORMATS = ['console', 'json', 'markdown', 'sarif', 'html'] as const;
const PRESETS = ['recommended', 'strict'] as const;
const CONFIG_KEYS = new Set([
  'baseLocale',
  'locales',
  'allowIdenticalKeys',
  'allowIdenticalValues',
  'placeholderPatterns',
  'source',
  'hardcoded',
  'checks',
  'format',
  'output',
  'baseline',
  'ignoreCodeLike',
  'ignoreSameLanguageFamily',
  'trimWhitespace',
  'ignoreCase',
  'includeIgnored',
  'failOn',
  'preset',
]);
const CHECK_KEYS = new Set<string>(CHECK_NAMES);
const HARDCODED_KEYS = new Set([
  'vueAttributes',
  'jsxAttributes',
  'functions',
  'ignoreFiles',
  'ignoreValues',
  'ignorePatterns',
  'sinks',
]);
const SINK_KEYS = new Set(['calls', 'assignments', 'properties']);
const CALL_SINK_KEYS = new Set(['callee', 'arguments']);

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function resolveConfigPath(explicitPath: string | undefined, cwd: string): Promise<string> {
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

export async function loadConfig(configPath: string): Promise<DetectorConfig> {
  let loaded: unknown;

  if (configPath.endsWith('.json') || configPath.endsWith('.cjs')) {
    loaded = require(configPath);
  } else {
    loaded = await import(pathToFileURL(configPath).href);
  }

  const config = moduleDefault(loaded);
  validateConfig(config);
  return withDefaults(config);
}

function moduleDefault(loaded: unknown): unknown {
  if (loaded && typeof loaded === 'object' && 'default' in loaded) {
    return (loaded as { default: unknown }).default;
  }
  return loaded;
}

function validateConfig(config: unknown): asserts config is DetectorConfigInput {
  if (!config || typeof config !== 'object') {
    throw appError('Config must export an object', 'CONFIG_INVALID');
  }

  const candidate = config as Record<string, unknown>;
  assertKnownKeys(candidate, CONFIG_KEYS, '');

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

  if (
    'preset' in candidate &&
    (typeof candidate.preset !== 'string' || !PRESETS.includes(candidate.preset as (typeof PRESETS)[number]))
  ) {
    throw appError('Config preset must be recommended or strict', 'CONFIG_INVALID');
  }

  const checks = (candidate.checks || {}) as Record<string, unknown>;
  assertKnownKeys(checks, CHECK_KEYS, 'checks');
  for (const check of CHECK_NAMES) {
    if (check in checks && typeof checks[check] !== 'boolean') {
      throw appError(`Config checks.${check} must be a boolean`, 'CONFIG_INVALID');
    }
  }

  if (
    'format' in candidate &&
    (typeof candidate.format !== 'string' ||
      !REPORT_FORMATS.includes(candidate.format as (typeof REPORT_FORMATS)[number]))
  ) {
    throw appError('Config format must be console, json, markdown, sarif, or html', 'CONFIG_INVALID');
  }

  if (
    'failOn' in candidate &&
    (typeof candidate.failOn !== 'string' || !FAIL_ON_LEVELS.includes(candidate.failOn as FailOnLevel))
  ) {
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

  const hardcoded = (candidate.hardcoded || {}) as Record<string, unknown>;
  assertKnownKeys(hardcoded, HARDCODED_KEYS, 'hardcoded');
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

  if ('sinks' in hardcoded && !isRecord(hardcoded.sinks)) {
    throw appError('Config hardcoded.sinks must be an object', 'CONFIG_INVALID');
  }
  const sinks = (hardcoded.sinks || {}) as Record<string, unknown>;
  assertKnownKeys(sinks, SINK_KEYS, 'hardcoded.sinks');
  if ('assignments' in sinks && !isStringArray(sinks.assignments)) {
    throw appError('Config hardcoded.sinks.assignments must be an array of strings', 'CONFIG_INVALID');
  }
  if ('properties' in sinks && !isStringArray(sinks.properties)) {
    throw appError('Config hardcoded.sinks.properties must be an array of strings', 'CONFIG_INVALID');
  }
  const calls = sinks.calls;
  if (calls !== undefined && !Array.isArray(calls)) {
    throw appError('Config hardcoded.sinks.calls must be an array', 'CONFIG_INVALID');
  }
  for (const [index, call] of (Array.isArray(calls) ? calls : []).entries()) {
    if (!isRecord(call)) {
      throw appError(`Config hardcoded.sinks.calls[${index}] must be an object`, 'CONFIG_INVALID');
    }
    assertKnownKeys(call, CALL_SINK_KEYS, `hardcoded.sinks.calls[${index}]`);
    if (typeof call.callee !== 'string' || !call.callee) {
      throw appError(`Config hardcoded.sinks.calls[${index}].callee must be a non-empty string`, 'CONFIG_INVALID');
    }
    if (
      !Array.isArray(call.arguments) ||
      call.arguments.length === 0 ||
      !call.arguments.every((value) => Number.isInteger(value) && Number(value) >= 0)
    ) {
      throw appError(
        `Config hardcoded.sinks.calls[${index}].arguments must be an array of non-negative integers`,
        'CONFIG_INVALID',
      );
    }
  }
}

function assertKnownKeys(value: Record<string, unknown>, allowedKeys: ReadonlySet<string>, path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      const option = path ? `${path}.${key}` : key;
      throw appError(`Unknown configuration option: ${option}`, 'CONFIG_INVALID');
    }
  }
}

function withDefaults(config: DetectorConfigInput): DetectorConfig {
  const { checks, source, hardcoded, placeholderPatterns, ignoreCodeLike, preset, ...rest } = config;
  const presetDefaults =
    preset === 'strict'
      ? { ignoreSameLanguageFamily: false, failOn: 'medium' as const }
      : { ignoreSameLanguageFamily: true, failOn: 'high' as const };

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
    source: source || [...DEFAULT_SOURCE_GLOBS],
    hardcoded: normalizeHardcodedConfig(hardcoded || {}),
    placeholderPatterns: normalizePlaceholderPatterns(placeholderPatterns || DEFAULT_PLACEHOLDER_PATTERNS),
    ignoreCodeLike: ignoreCodeLike ?? true,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateRuleList(rules: unknown, name: string): asserts rules is Rule[] | undefined {
  if (rules === undefined) return;
  if (!Array.isArray(rules)) throw appError(`Config ${name} must be an array`, 'CONFIG_INVALID');

  for (const rule of rules) {
    if (typeof rule !== 'string' && !(rule instanceof RegExp)) {
      throw appError(`Config ${name} entries must be strings or RegExp objects`, 'CONFIG_INVALID');
    }
  }
}

function normalizePlaceholderPatterns(patterns: readonly Rule[]): RegExp[] {
  return patterns
    .map((pattern) => {
      if (pattern instanceof RegExp) return withGlobalFlag(pattern);

      if (typeof pattern !== 'string') {
        throw appError('Config placeholderPatterns entries must be strings or RegExp objects', 'CONFIG_INVALID');
      }

      try {
        return new RegExp(pattern, 'g');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw appError(`Invalid placeholder pattern "${pattern}": ${message}`, 'CONFIG_INVALID');
      }
    })
    .sort((a, b) => b.source.length - a.source.length);
}

function normalizeHardcodedConfig(config: HardcodedConfigInput): HardcodedConfig {
  return {
    vueAttributes: config.vueAttributes || [...DEFAULT_HARDCODED_ATTRIBUTES],
    jsxAttributes: config.jsxAttributes || [...DEFAULT_HARDCODED_ATTRIBUTES],
    functions: config.functions || [...DEFAULT_HARDCODED_FUNCTIONS],
    ignoreFiles: config.ignoreFiles || [],
    ignoreValues: config.ignoreValues || [],
    ignorePatterns: normalizeRegexRules(config.ignorePatterns || [], 'hardcoded.ignorePatterns'),
    sinks: {
      calls: config.sinks?.calls || [],
      assignments: config.sinks?.assignments || [],
      properties: config.sinks?.properties || [],
    },
  };
}

function normalizeRegexRules(rules: readonly Rule[], name: string): RegExp[] {
  return rules.map((rule) => {
    if (rule instanceof RegExp) return rule;
    if (typeof rule !== 'string') {
      throw appError(`Config ${name} entries must be strings or RegExp objects`, 'CONFIG_INVALID');
    }

    try {
      return new RegExp(rule);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw appError(`Invalid ${name} pattern "${rule}": ${message}`, 'CONFIG_INVALID');
    }
  });
}

function withGlobalFlag(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}
