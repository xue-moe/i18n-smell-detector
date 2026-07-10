import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

function run(args: string[]) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
}

test('check writes Markdown reports to files', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-output-'));
  const output = path.join(tempDir, 'reports/i18n-report.md');

  try {
    const result = run([
      'check',
      '--config',
      'examples/basic/i18n-smell.config.mjs',
      '--format',
      'markdown',
      '--output',
      output,
      '--fail-on',
      'none',
    ]);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Report written to/);
    assert.match(await readFile(output, 'utf8'), /# i18n-smell-detector report/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('check writes valid JSON reports to files', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-output-'));
  const output = path.join(tempDir, 'i18n-report.json');

  try {
    const result = run([
      'check',
      '--config',
      'examples/basic/i18n-smell.config.mjs',
      '--format',
      'json',
      '--output',
      output,
      '--fail-on',
      'none',
    ]);

    assert.equal(result.status, 0);
    const report = JSON.parse(await readFile(output, 'utf8'));
    assert.ok(report.summary.identical);
    assert.ok(report.summary.hardcoded);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
