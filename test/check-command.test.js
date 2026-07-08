import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

function run(args, options = {}) {
  return spawnSync(process.execPath, [bin, ...args], {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
  });
}

test('combined check runs enabled checks', () => {
  const result = run([
    'check',
    '--config',
    'examples/basic/i18n-smell.config.mjs',
    '--fail-on',
    'none',
  ]);

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
    await writeFile(path.join(tempDir, 'i18n-smell.config.mjs'), `
      export default {
        checks: { identical: true, hardcoded: false },
        locales: {
          en: './src/locales/en.json',
          zh: './src/locales/zh.json'
        }
      };
    `);

    const result = run(['check', '--config', path.join(tempDir, 'i18n-smell.config.mjs'), '--fail-on', 'none']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /identical translations/);
    assert.doesNotMatch(result.stdout, /hardcoded strings/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
