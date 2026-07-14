import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadFlattenedLocales } from '../dist/locale/load-locales.js';

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
        tempDir,
      ),
      /Failed to read locale file: \.\/missing\.json\nReason: file not found/,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadFlattenedLocales identifies invalid locale files', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-'));

  try {
    await writeFile(path.join(tempDir, 'collision.json'), JSON.stringify({ 'user.name': 'A', user: { name: 'B' } }));
    await writeFile(path.join(tempDir, 'unsupported.json'), JSON.stringify({ count: 1 }));

    await assert.rejects(
      loadFlattenedLocales({ baseLocale: 'en', locales: { en: './collision.json' } }, tempDir),
      /Failed to flatten locale file: \.\/collision\.json\nReason: Flattened locale key collision at "user\.name"/,
    );
    await assert.rejects(
      loadFlattenedLocales({ baseLocale: 'en', locales: { en: './unsupported.json' } }, tempDir),
      /Failed to flatten locale file: \.\/unsupported\.json\nReason: Unsupported locale value at "count": expected a string; received number/,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
