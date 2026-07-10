import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

function run(args: string[], options: { cwd?: string } = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
  });
}

test('combined check runs enabled checks', () => {
  const result = run(['check', '--config', 'examples/basic/i18n-smell.config.mjs', '--fail-on', 'none']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /i18n-smell-detector: identical translations/);
  assert.match(result.stdout, /i18n-smell-detector: hardcoded strings/);
});

test('combined check skips disabled checks', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-check-'));

  try {
    await mkdir(path.join(tempDir, 'src/locales'), { recursive: true });
    await writeFile(path.join(tempDir, 'src/locales/en.json'), '{"home":{"title":"Welcome"}}');
    await writeFile(path.join(tempDir, 'src/locales/zh.json'), '{"home":{"title":"Welcome"}}');
    await writeFile(
      path.join(tempDir, 'i18n-smell.config.mjs'),
      `
      export default {
        checks: { identical: true, hardcoded: false, placeholders: false },
        locales: {
          en: './src/locales/en.json',
          zh: './src/locales/zh.json'
        }
      };
    `,
    );

    const result = run(['check', '--config', path.join(tempDir, 'i18n-smell.config.mjs'), '--fail-on', 'none']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /identical translations/);
    assert.doesNotMatch(result.stdout, /hardcoded strings/);
    assert.doesNotMatch(result.stdout, /placeholder mismatches/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('check-placeholders command reports locale placeholder mismatches', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-placeholders-'));

  try {
    await mkdir(path.join(tempDir, 'src/locales'), { recursive: true });
    await writeFile(path.join(tempDir, 'src/locales/en.json'), '{"user":{"greeting":"Hello {name}"}}');
    await writeFile(path.join(tempDir, 'src/locales/zh.json'), '{"user":{"greeting":"你好"}}');
    await writeFile(
      path.join(tempDir, 'i18n-smell.config.mjs'),
      `
      export default {
        locales: {
          en: './src/locales/en.json',
          zh: './src/locales/zh.json'
        }
      };
    `,
    );

    const result = run([
      'check-placeholders',
      '--config',
      path.join(tempDir, 'i18n-smell.config.mjs'),
      '--format',
      'json',
      '--fail-on',
      'none',
    ]);

    assert.equal(result.status, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.issues[0].key, 'user.greeting');
    assert.deepEqual(report.issues[0].missing, ['{name}']);
    assert.equal(report.issues[0].reason, 'missing placeholder');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
