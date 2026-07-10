import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

type JsonIssue = {
  id?: string;
  value?: string;
  check?: string;
  reason?: string;
};

type JsonIssueFile = {
  version?: number;
  issues: JsonIssue[];
};

function parseIssuesJson(text: string): JsonIssueFile {
  return JSON.parse(text) as JsonIssueFile;
}

function run(args: string[]) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
}

async function writeBasicProject(root: string, buttonText = 'Save') {
  await mkdir(path.join(root, 'src/locales'), { recursive: true });
  await mkdir(path.join(root, 'src/components'), { recursive: true });
  await writeFile(
    path.join(root, 'src/locales/en.json'),
    JSON.stringify({
      home: { title: 'Welcome back' },
      common: { ok: 'OK' },
    }),
  );
  await writeFile(
    path.join(root, 'src/locales/zh.json'),
    JSON.stringify({
      home: { title: 'Welcome back' },
      common: { ok: 'OK' },
    }),
  );
  await writeFile(
    path.join(root, 'src/components/UserPanel.vue'),
    `<template>
  <section>
    <h1>Account settings</h1>
    <button>${buttonText}</button>
  </section>
</template>
`,
  );
  await writeFile(
    path.join(root, 'i18n-smell.config.mjs'),
    `
    export default {
      checks: { identical: true, hardcoded: true },
      locales: {
        en: './src/locales/en.json',
        zh: './src/locales/zh.json'
      },
      source: ['./src/**/*.vue'],
      allowIdenticalValues: ['OK']
    };
  `,
  );
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
    const parsed = parseIssuesJson(await readFile(baseline, 'utf8'));
    assert.equal(parsed.version, 1);
    assert.ok(parsed.issues.some((issue) => issue.id === 'identical:zh:home.title'));
    assert.ok(parsed.issues.some((issue) => issue.id?.startsWith('hardcoded:')));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('baseline suppresses known issues but leaves new issues failing', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeFile(
      baseline,
      JSON.stringify({
        version: 1,
        issues: [
          {
            id: 'identical:zh:home.title',
            key: 'home.title',
            targetLocale: 'zh',
            value: 'Welcome back',
          },
        ],
      }),
    );

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
    const report = parseIssuesJson(result.stdout);
    assert.equal(
      report.issues.some((issue) => issue.id === 'identical:zh:home.title'),
      false,
    );
    assert.ok(report.issues.some((issue) => issue.check === 'hardcoded'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('missing baseline file is treated as empty', () => {
  const result = run([
    'check',
    '--config',
    'examples/basic/i18n-smell.config.mjs',
    '--baseline',
    'test/fixtures/missing-baseline.json',
    '--format',
    'json',
    '--fail-on',
    'none',
  ]);

  assert.equal(result.status, 0);
  assert.ok(JSON.parse(result.stdout).issues.length > 0);
});

test('invalid baseline JSON fails clearly', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeFile(baseline, '{nope');
    const result = run([
      'check',
      '--config',
      'examples/basic/i18n-smell.config.mjs',
      '--baseline',
      baseline,
      '--fail-on',
      'none',
    ]);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /Failed to read baseline file/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('stale baseline issues disappear when baseline is updated', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeBasicProject(tempDir);
    await writeFile(
      baseline,
      JSON.stringify({
        version: 1,
        issues: [
          { id: 'identical:zh:removed.key', key: 'removed.key', targetLocale: 'zh', value: 'Removed' },
          { id: 'identical:zh:home.title', key: 'home.title', targetLocale: 'zh', value: 'Welcome back' },
        ],
      }),
    );

    const result = run([
      'check',
      '--config',
      path.join(tempDir, 'i18n-smell.config.mjs'),
      '--baseline',
      baseline,
      '--update-baseline',
    ]);

    assert.equal(result.status, 0);
    const parsed = parseIssuesJson(await readFile(baseline, 'utf8'));
    assert.equal(
      parsed.issues.some((issue) => issue.id === 'identical:zh:removed.key'),
      false,
    );
    assert.equal(
      parsed.issues.some((issue) => issue.id === 'identical:zh:home.title'),
      true,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('moving a hardcoded string changes its baseline id', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeBasicProject(tempDir);
    await writeFile(
      baseline,
      JSON.stringify({
        version: 1,
        issues: [
          {
            id: 'hardcoded:src/components/UserPanel.vue:8:13:Save',
            file: 'src/components/UserPanel.vue',
            line: 8,
            column: 13,
            value: 'Save',
          },
        ],
      }),
    );

    const result = run([
      'check',
      '--config',
      path.join(tempDir, 'i18n-smell.config.mjs'),
      '--baseline',
      baseline,
      '--format',
      'json',
      '--fail-on',
      'none',
    ]);

    assert.equal(result.status, 0);
    const report = parseIssuesJson(result.stdout);
    assert.ok(report.issues.some((issue) => issue.check === 'hardcoded' && issue.value === 'Save'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('includeIgnored shows baseline issues', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeFile(
      baseline,
      JSON.stringify({
        version: 1,
        issues: [
          {
            id: 'identical:zh:home.title',
            key: 'home.title',
            targetLocale: 'zh',
            value: 'Welcome back',
          },
        ],
      }),
    );

    const result = run([
      'check',
      '--config',
      'examples/basic/i18n-smell.config.mjs',
      '--baseline',
      baseline,
      '--format',
      'json',
      '--include-ignored',
      '--fail-on',
      'none',
    ]);

    assert.equal(result.status, 0);
    const report = parseIssuesJson(result.stdout);
    assert.ok(report.issues.some((issue) => issue.id === 'identical:zh:home.title' && issue.reason === 'baseline'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('baseline update writes only current non-ignored findings', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeBasicProject(tempDir);
    const result = run([
      'check',
      '--config',
      path.join(tempDir, 'i18n-smell.config.mjs'),
      '--baseline',
      baseline,
      '--update-baseline',
    ]);

    assert.equal(result.status, 0);
    const parsed = parseIssuesJson(await readFile(baseline, 'utf8'));
    assert.equal(
      parsed.issues.some((issue) => issue.value === 'OK'),
      false,
    );
    assert.ok(parsed.issues.every((issue) => issue.id && issue.value));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
