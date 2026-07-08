import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';

test('loadConfig applies hardcoded defaults', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');

  try {
    await writeFile(configPath, 'export default {};');
    const config = await loadConfig(configPath);

    assert.deepEqual(config.source, ['src/**/*.vue']);
    assert.deepEqual(config.hardcoded.vueAttributes, [
      'placeholder',
      'title',
      'alt',
      'aria-label',
      'aria-description',
    ]);
    assert.deepEqual(config.hardcoded.ignoreValues, []);
    assert.deepEqual(config.hardcoded.ignorePatterns, []);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig normalizes hardcoded ignore patterns', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');

  try {
    await writeFile(configPath, "export default { hardcoded: { ignorePatterns: ['^v\\\\d+$'] } };");
    const config = await loadConfig(configPath);

    assert.equal(config.hardcoded.ignorePatterns[0].test('v2'), true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
