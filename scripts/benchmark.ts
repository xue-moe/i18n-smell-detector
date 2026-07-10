import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { checkHardcodedStrings } from '../dist/check-hardcoded.js';
import { checkIdenticalTranslations } from '../dist/check-identical.js';
import { checkPlaceholders } from '../dist/check-placeholders.js';
import { loadConfig } from '../dist/config.js';
import { loadFlattenedLocales } from '../dist/locale/load-locales.js';

async function measure<T>(name: string, run: () => Promise<T> | T): Promise<T> {
  const start = performance.now();
  const result = await run();
  const elapsed = performance.now() - start;
  const count = Array.isArray(result) ? result.length : 'n/a';
  console.log(`${name}: ${elapsed.toFixed(1)}ms issues=${count}`);
  return result;
}

function makeLocale(prefix: string, size: number, withPlaceholderBug = false): Record<string, string> {
  const locale: Record<string, string> = {};
  for (let index = 0; index < size; index += 1) {
    locale[`screen.${index}.title`] = index % 50 === 0 ? 'Profile settings' : `${prefix} title ${index}`;
    locale[`screen.${index}.body`] =
      withPlaceholderBug && index % 100 === 0 ? `${prefix} body` : `${prefix} body {count}`;
  }
  return locale;
}

async function main() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-bench-'));
  const keyCount = Number(process.env.I18N_SMELL_BENCH_KEYS || 3000);

  try {
    await mkdir(path.join(tempDir, 'src/locales'), { recursive: true });
    await mkdir(path.join(tempDir, 'src/components'), { recursive: true });
    await writeFile(path.join(tempDir, 'src/locales/en.json'), JSON.stringify(makeLocale('English', keyCount)));
    await writeFile(path.join(tempDir, 'src/locales/zh.json'), JSON.stringify(makeLocale('中文', keyCount, true)));
    await writeFile(
      path.join(tempDir, 'src/components/Panel.vue'),
      `
<template>
  <section>
    <h1>Profile settings</h1>
    <button title="Save changes">Save</button>
  </section>
</template>
<script setup>
toast.success('Saved changes');
</script>
`,
    );
    await writeFile(
      path.join(tempDir, 'i18n-smell.config.mjs'),
      `
export default {
  baseLocale: 'en',
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json'
  },
  source: ['src/**/*.{vue,js,ts,jsx,tsx}'],
  hardcoded: {
    functions: ['toast.success']
  },
  ignoreSameLanguageFamily: false,
  failOn: 'none'
};
`,
    );

    const config = await measure('loadConfig', () => loadConfig(path.join(tempDir, 'i18n-smell.config.mjs')));
    const locales = await measure('loadLocales', () => loadFlattenedLocales(config, tempDir));
    await measure('checkIdentical', () => checkIdenticalTranslations(locales, config));
    await measure('checkPlaceholders', () => checkPlaceholders(locales, config));
    await measure('checkHardcoded', () => checkHardcodedStrings(config, tempDir));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

await main();
