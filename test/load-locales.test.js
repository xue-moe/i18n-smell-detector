import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadFlattenedLocales } from '../src/locale/load-locales.js';

test('loadFlattenedLocales reports missing locale files clearly', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-'));

  try {
    await writeFile(path.join(tempDir, 'en.json'), JSON.stringify({ hello: 'Hello' }));

    await assert.rejects(
      loadFlattenedLocales(
        {
          baseLocale: 'en',
          locales: {
            en: './en.json',
            zh: './missing.json',
          },
        },
        tempDir
      ),
      /Failed to read locale file: \.\/missing\.json\nReason: file not found/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
