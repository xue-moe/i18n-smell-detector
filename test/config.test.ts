import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../dist/config.js';

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
        source: ['src/**/*.{vue,js,jsx,ts,tsx}'],
        checks: {
          identical: true,
          hardcoded: true,
          placeholders: true,
        },
        hardcoded: undefined,
        ignoreCodeLike: true,
        ignoreSameLanguageFamily: true,
        trimWhitespace: true,
        ignoreCase: false,
        includeIgnored: false,
        failOn: 'high',
      },
    );
    assert.deepEqual(
      config.placeholderPatterns.map((pattern) => pattern.source),
      [
        String.raw`(?<!\{)\{[^{}]+\}(?!\})`,
        String.raw`%\([^)]+\)[sdif]`,
        String.raw`\{\{[^}]+\}\}`,
        String.raw`%[sdif]`,
        String.raw`\$\d+`,
      ],
    );
    assert.deepEqual(
      config.placeholderPatterns.map((pattern) => pattern.flags),
      ['g', 'g', 'g', 'g', 'g'],
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig reports invalid placeholder patterns clearly', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');

  try {
    await writeFile(configPath, "export default { placeholderPatterns: ['['] };");
    await assert.rejects(() => loadConfig(configPath), /Invalid placeholder pattern "\["/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig rejects invalid failOn and boolean options', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const failOnConfigPath = path.join(tempDir, 'invalid-fail-on.config.mjs');
  const booleanConfigPath = path.join(tempDir, 'invalid-boolean.config.mjs');

  try {
    await writeFile(failOnConfigPath, "export default { failOn: 'critical' };");
    await assert.rejects(() => loadConfig(failOnConfigPath), /Config failOn must be high, medium, low, or none/);

    await writeFile(booleanConfigPath, "export default { includeIgnored: 'yes' };");
    await assert.rejects(() => loadConfig(booleanConfigPath), /Config includeIgnored must be a boolean/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig rejects non-boolean check toggles', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');

  try {
    await writeFile(configPath, "export default { checks: { hardcoded: 'no' } };");
    await assert.rejects(() => loadConfig(configPath), /Config checks\.hardcoded must be a boolean/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig rejects unknown top-level and check options', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const topLevelConfigPath = path.join(tempDir, 'unknown-top-level.config.mjs');
  const checkConfigPath = path.join(tempDir, 'unknown-check.config.mjs');

  try {
    await writeFile(topLevelConfigPath, 'export default { typoOption: true };');
    await assert.rejects(() => loadConfig(topLevelConfigPath), /Unknown configuration option: typoOption/);

    await writeFile(checkConfigPath, 'export default { checks: { typoCheck: true } };');
    await assert.rejects(() => loadConfig(checkConfigPath), /Unknown configuration option: checks\.typoCheck/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig supports recommended and strict presets', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const strictConfigPath = path.join(tempDir, 'strict.config.mjs');
  const invalidConfigPath = path.join(tempDir, 'invalid-preset.config.mjs');

  try {
    await writeFile(strictConfigPath, "export default { preset: 'strict' };");
    const strict = await loadConfig(strictConfigPath);
    assert.equal(strict.ignoreSameLanguageFamily, false);
    assert.equal(strict.failOn, 'medium');
    assert.equal('preset' in strict, false);

    await writeFile(invalidConfigPath, "export default { preset: 'loud' };");
    await assert.rejects(() => loadConfig(invalidConfigPath), /Config preset must be recommended or strict/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
