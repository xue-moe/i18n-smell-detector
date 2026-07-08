import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';

test('loadConfig applies documented defaults', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');

  try {
    await writeFile(configPath, 'export default {};');
    const config = await loadConfig(configPath);

    assert.deepEqual(
      {
        ...config,
        placeholderPatterns: undefined,
        hardcoded: undefined,
      },
      {
        baseLocale: 'en',
        locales: {},
        allowIdenticalKeys: [],
        allowIdenticalValues: [],
        placeholderPatterns: undefined,
        source: ['src/**/*.vue'],
        checks: {
          identical: true,
          hardcoded: true,
        },
        hardcoded: undefined,
        ignoreCodeLike: true,
        ignoreSameLanguageFamily: true,
        trimWhitespace: true,
        ignoreCase: false,
        includeIgnored: false,
        failOn: 'high',
      }
    );
    assert.deepEqual(config.placeholderPatterns.map((pattern) => pattern.source), [
      String.raw`\{\{[^}]+\}\}`,
      String.raw`\{[^}]+\}`,
    ]);
    assert.deepEqual(config.placeholderPatterns.map((pattern) => pattern.flags), ['g', 'g']);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig reports invalid placeholder patterns clearly', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');

  try {
    await writeFile(configPath, "export default { placeholderPatterns: ['['] };");
    await assert.rejects(
      () => loadConfig(configPath),
      /Invalid placeholder pattern "\["/
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
