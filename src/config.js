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
  if (typeof candidate.baseLocale !== 'string' || !candidate.baseLocale) {
    throw new Error('Config must include baseLocale');
  }

  if (!candidate.locales || typeof candidate.locales !== 'object' || Array.isArray(candidate.locales)) {
    throw new Error('Config must include locales as an object');
  }

  for (const [locale, value] of Object.entries(candidate.locales)) {
    if (typeof value !== 'string' || !value) {
      throw new Error(`Config locales.${locale} must be a file path string`);
    }
  }
}

/** @param {import('./types.js').DetectorConfig} config */
function withDefaults(config) {
  return {
    allowIdenticalKeys: [],
    allowIdenticalValues: [],
    ignoreSameLanguageFamily: true,
    trimWhitespace: true,
    ignoreCase: false,
    includeIgnored: false,
    failOn: 'high',
    ...config,
  };
}
