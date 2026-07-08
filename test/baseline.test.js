import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
}

test('baseline update writes current issues', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    const result = run([
      'check',
      '--config',
      'examples/basic/i18n-smell.config.mjs',
      '--baseline',
      baseline,
      '--update-baseline',
    ]);

    assert.equal(result.status, 0);
    const parsed = JSON.parse(await readFile(baseline, 'utf8'));
    assert.equal(parsed.version, 1);
    assert.ok(parsed.issues.some((issue) => issue.id === 'identical:zh:home.title'));
    assert.ok(parsed.issues.some((issue) => issue.id.startsWith('hardcoded:')));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('baseline suppresses known issues but leaves new issues failing', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeFile(baseline, JSON.stringify({
      version: 1,
      issues: [
        {
          id: 'identical:zh:home.title',
          key: 'home.title',
          targetLocale: 'zh',
          value: 'Welcome back',
        },
      ],
    }));

    const result = run([
      'check',
      '--config',
      'examples/basic/i18n-smell.config.mjs',
      '--baseline',
      baseline,
      '--format',
      'json',
      '--fail-on',
      'medium',
    ]);

    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.issues.some((issue) => issue.id === 'identical:zh:home.title'), false);
    assert.ok(report.issues.some((issue) => issue.check === 'hardcoded'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
