import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { flattenLocale } from './flatten-locale.js';

async function readJson(filePath) {
  const text = await readFile(filePath, 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse ${filePath}: ${message}`);
  }
}

/**
 * @param {import('../types.js').DetectorConfig} config
 * @param {string} cwd
 */
export async function loadFlattenedLocales(config, cwd) {
  const locales = {};

  for (const [locale, localePath] of Object.entries(config.locales || {})) {
    const absolutePath = path.isAbsolute(localePath) ? localePath : path.resolve(cwd, localePath);
    locales[locale] = flattenLocale(await readJson(absolutePath));
  }

  if (!locales[config.baseLocale]) {
    throw new Error(`baseLocale "${config.baseLocale}" is not listed in config.locales`);
  }

  return locales;
}
