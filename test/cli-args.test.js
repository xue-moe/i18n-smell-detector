import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
}

test('CLI rejects unsupported format values clearly', () => {
  const result = run(['check', '--format', 'xml']);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unsupported format: xml/);
});

test('CLI rejects missing option values clearly', () => {
  const result = run(['check', '--config']);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /option '-c, --config <path>' argument missing/);
});

test('CLI rejects unknown options clearly', () => {
  const result = run(['check', '--wat']);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown option: --wat/);
});

test('help command prints usage successfully', () => {
  const result = run(['help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /i18n-smell-detector init/);
  assert.equal(result.stderr, '');
});

test('init creates a starter config without overwriting existing files', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-init-'));

  try {
    const created = spawnSync(process.execPath, [bin, 'init'], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    assert.equal(created.status, 0, created.stderr);
    assert.match(created.stdout, /Created i18n-smell.config.mjs/);
    const config = await readFile(path.join(tempDir, 'i18n-smell.config.mjs'), 'utf8');
    assert.match(config, /baseLocale: 'en'/);
    assert.match(config, /failOn: 'none'/);

    await writeFile(path.join(tempDir, 'i18n-smell.config.mjs'), 'custom');
    const blocked = spawnSync(process.execPath, [bin, 'init'], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    assert.equal(blocked.status, 2);
    assert.match(blocked.stderr, /Config file already exists/);
    assert.equal(await readFile(path.join(tempDir, 'i18n-smell.config.mjs'), 'utf8'), 'custom');

    const forced = spawnSync(process.execPath, [bin, 'init', '--force'], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    assert.equal(forced.status, 0, forced.stderr);
    assert.match(await readFile(path.join(tempDir, 'i18n-smell.config.mjs'), 'utf8'), /source:/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('init discovers locale JSON files in common project directories', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-init-locales-'));

  try {
    await mkdir(path.join(tempDir, 'src/locales'), { recursive: true });
    await writeFile(path.join(tempDir, 'src/locales/en.json'), '{}');
    await writeFile(path.join(tempDir, 'src/locales/ja.json'), '{}');

    const result = spawnSync(process.execPath, [bin, 'init'], {
      cwd: tempDir,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr);
    const config = await readFile(path.join(tempDir, 'i18n-smell.config.mjs'), 'utf8');
    assert.match(config, /baseLocale: 'en'/);
    assert.match(config, /en: '.\/src\/locales\/en\.json'/);
    assert.match(config, /ja: '.\/src\/locales\/ja\.json'/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
