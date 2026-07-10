import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { flattenLocale } from './flatten-locale.js';
import type { DetectorConfig } from '../types.js';

function readErrorReason(error) {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'ENOENT') return 'file not found';
    if (error.code === 'EACCES') return 'permission denied';
  }

  return error instanceof Error ? error.message : String(error);
}

async function readJson(filePath, displayPath = filePath) {
  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read locale file: ${displayPath}\nReason: ${readErrorReason(error)}`);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse locale file: ${displayPath}\nReason: ${message}`);
  }
}

/**
 * @param {import('../types.js').DetectorConfig} config
 * @param {string} cwd
 */
export async function loadFlattenedLocales(config: Pick<DetectorConfig, 'baseLocale' | 'locales'>, cwd: string) {
  const locales: Record<string, Record<string, string>> = {};

  for (const [locale, localePath] of Object.entries(config.locales || {})) {
    const absolutePath = path.isAbsolute(localePath) ? localePath : path.resolve(cwd, localePath);
    locales[locale] = flattenLocale(await readJson(absolutePath, localePath));
  }

  if (!locales[config.baseLocale]) {
    throw new Error(`baseLocale "${config.baseLocale}" is not listed in config.locales`);
  }

  return locales;
}
