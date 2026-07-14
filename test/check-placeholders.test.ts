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
    assert.deepEqual(extractPlaceholders('Hello {name} {{ count }} %s %d %(item)s', config.placeholderPatterns), [
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

test('dollar-number placeholders are opt-in to avoid matching currency', async () => {
  const { config, tempDir } = await loadDefaultConfig();

  try {
    for (const value of ['$1', '$10', '$10.50', '$1,000']) {
      assert.deepEqual(extractPlaceholders(value, config.placeholderPatterns), []);
    }

    const explicitPatterns = [/\$\d+/g];
    assert.deepEqual(extractPlaceholders('$1', explicitPatterns), ['$1']);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('public placeholder APIs normalize non-global patterns without mutating callers', () => {
  const nonGlobalPattern = /\{[a-z]+\}/i;
  const statefulPattern = /\{[a-z]+\}/gi;
  statefulPattern.lastIndex = 8;

  assert.deepEqual(extractPlaceholders('{Name} and {COUNT}', [nonGlobalPattern]), ['{COUNT}', '{Name}']);
  assert.deepEqual(extractPlaceholders('{First} and {SECOND}', [statefulPattern]), ['{First}', '{SECOND}']);
  assert.equal(nonGlobalPattern.flags, 'i');
  assert.equal(statefulPattern.lastIndex, 8);

  const issues = checkPlaceholders(
    {
      en: { greeting: 'Hello {first} and {second}' },
      fr: { greeting: 'Bonjour {first}' },
    },
    {
      baseLocale: 'en',
      placeholderPatterns: [/\{[^}]+\}/],
    },
  );

  assert.deepEqual(
    issues.map(({ missing, extra }) => ({ missing, extra })),
    [{ missing: ['{second}'], extra: [] }],
  );
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

test('checkPlaceholders compares placeholder occurrence counts', async () => {
  const { config, tempDir } = await loadDefaultConfig();

  try {
    const issues = checkPlaceholders(
      {
        en: {
          printfMissing: '%s of %s items',
          namedMissing: '{name} invited {name}',
          reordered: '{first} then {second}',
          printfExtra: '%s items',
          mixedCounts: '{name} has %s of %s items',
        },
        zh: {
          printfMissing: '%s items',
          namedMissing: '{name} invited',
          reordered: '{second}, then {first}',
          printfExtra: '%s of %s items',
          mixedCounts: '{name} met {name} with %s items',
        },
      },
      {
        ...config,
        baseLocale: 'en',
      },
    );

    assert.deepEqual(
      issues.map(({ key, missing, extra }) => ({ key, missing, extra })),
      [
        { key: 'mixedCounts', missing: ['%s'], extra: ['{name}'] },
        { key: 'namedMissing', missing: ['{name}'], extra: [] },
        { key: 'printfMissing', missing: ['%s'], extra: [] },
        { key: 'printfExtra', missing: [], extra: ['%s'] },
      ],
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
