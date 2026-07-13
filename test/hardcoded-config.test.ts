import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../dist/config.js';

test('loadConfig applies hardcoded defaults', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');

  try {
    await writeFile(configPath, 'export default {};');
    const config = await loadConfig(configPath);

    assert.deepEqual(config.source, ['src/**/*.{vue,js,jsx,ts,tsx}']);
    assert.deepEqual(config.hardcoded.vueAttributes, ['placeholder', 'title', 'alt', 'aria-label', 'aria-description']);
    assert.deepEqual(config.hardcoded.jsxAttributes, config.hardcoded.vueAttributes);
    assert.deepEqual(config.hardcoded.functions, ['alert', 'confirm', 'toast.success', 'toast.error']);
    assert.deepEqual(config.hardcoded.ignoreFiles, []);
    assert.deepEqual(config.hardcoded.ignoreValues, []);
    assert.deepEqual(config.hardcoded.ignorePatterns, []);
    assert.deepEqual(config.hardcoded.sinks, { calls: [], assignments: [], properties: [] });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('loadConfig validates and normalizes configured message sinks', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const validPath = path.join(tempDir, 'valid-sinks.config.mjs');
  const invalidPath = path.join(tempDir, 'invalid-sinks.config.mjs');

  try {
    await writeFile(
      validPath,
      `export default { hardcoded: { sinks: {
        calls: [{ callee: 'notify', arguments: [0, 2] }],
        assignments: ['error.value'],
        properties: ['summary', 'detail']
      } } };`,
    );
    const config = await loadConfig(validPath);
    assert.deepEqual(config.hardcoded.sinks, {
      calls: [{ callee: 'notify', arguments: [0, 2] }],
      assignments: ['error.value'],
      properties: ['summary', 'detail'],
    });

    await writeFile(
      invalidPath,
      `export default { hardcoded: { sinks: { calls: [{ callee: 'notify', arguments: [-1] }] } } };`,
    );
    await assert.rejects(
      () => loadConfig(invalidPath),
      /hardcoded\.sinks\.calls\[0\]\.arguments must be an array of non-negative integers/,
    );
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

test('loadConfig rejects unknown hardcoded options', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-config-'));
  const configPath = path.join(tempDir, 'i18n-smell.config.mjs');

  try {
    await writeFile(configPath, 'export default { hardcoded: { typoNestedOption: true } };');
    await assert.rejects(() => loadConfig(configPath), /Unknown configuration option: hardcoded\.typoNestedOption/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
