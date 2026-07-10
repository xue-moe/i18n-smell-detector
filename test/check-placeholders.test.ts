import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPlaceholders, extractPlaceholders } from '../dist/check-placeholders.js';
import { loadConfig } from '../dist/config.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function loadDefaultConfig() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-placeholders-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');
  await writeFile(configPath, 'export default {};');
  const config = await loadConfig(configPath);
  return { config, tempDir };
}

test('extractPlaceholders supports common placeholder styles', async () => {
  const { config, tempDir } = await loadDefaultConfig();

  try {
    assert.deepEqual(extractPlaceholders('Hello {name} {{ count }} %s %d %(item)s $1', config.placeholderPatterns), [
      '$1',
      '%(item)s',
      '%d',
      '%s',
      '{name}',
      '{{ count }}',
    ]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('checkPlaceholders reports missing and extra target placeholders', async () => {
  const { config, tempDir } = await loadDefaultConfig();

  try {
    const issues = checkPlaceholders(
      {
        en: {
          greeting: 'Hello {name}',
          count: '{count} items',
          template: 'Hi {{ user }}',
        },
        zh: {
          greeting: '你好',
          count: '{count} 件商品 {unused}',
          template: '你好 {{ user }}',
        },
      },
      {
        ...config,
        baseLocale: 'en',
      },
    );

    assert.deepEqual(
      issues.map((issue) => ({
        key: issue.key,
        missing: issue.missing,
        extra: issue.extra,
        severity: issue.severity,
        reason: issue.reason,
      })),
      [
        {
          key: 'greeting',
          missing: ['{name}'],
          extra: [],
          severity: 'high',
          reason: 'missing placeholder',
        },
        {
          key: 'count',
          missing: [],
          extra: ['{unused}'],
          severity: 'medium',
          reason: 'extra placeholder',
        },
      ],
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
