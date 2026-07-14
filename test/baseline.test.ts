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
  file?: string;
  kind?: string;
  nodeType?: string;
  parentNodeType?: string;
  containsInterpolation?: boolean;
  range?: unknown;
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
    assert.equal(parsed.version, 4);
    assert.ok(parsed.issues.some((issue) => issue.id?.startsWith('identical:v4:')));
    assert.ok(parsed.issues.some((issue) => issue.id?.startsWith('hardcoded:v3:')));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('baseline suppresses known issues but leaves new issues failing', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeBasicProject(tempDir);
    const update = run([
      'check',
      '--config',
      path.join(tempDir, 'i18n-smell.config.mjs'),
      '--baseline',
      baseline,
      '--update-baseline',
    ]);
    assert.equal(update.status, 0, update.stderr);

    const componentPath = path.join(tempDir, 'src/components/UserPanel.vue');
    const component = await readFile(componentPath, 'utf8');
    await writeFile(componentPath, component.replace('Save', 'New warning'));

    const result = run([
      'check',
      '--config',
      path.join(tempDir, 'i18n-smell.config.mjs'),
      '--baseline',
      baseline,
      '--format',
      'json',
      '--include-ignored',
      '--fail-on',
      'medium',
    ]);

    assert.equal(result.status, 1);
    const report = parseIssuesJson(result.stdout);
    assert.ok(report.issues.some((issue) => issue.check === 'identical' && issue.reason === 'baseline'));
    assert.ok(report.issues.some((issue) => issue.value === 'New warning' && issue.reason !== 'baseline'));
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

test('unsupported baseline versions fail clearly', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeFile(baseline, JSON.stringify({ version: 99, issues: [] }));
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
    assert.match(result.stderr, /Unsupported baseline version/);
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
        version: 4,
        issues: [{ id: 'identical:v4:stale', key: 'removed.key', targetLocale: 'zh', value: 'Removed' }],
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
      parsed.issues.some((issue) => issue.id === 'identical:v4:stale'),
      false,
    );
    assert.ok(parsed.issues.some((issue) => issue.id?.startsWith('identical:v4:')));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('baseline fingerprints survive source position changes', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeBasicProject(tempDir);
    const update = run([
      'check',
      '--config',
      path.join(tempDir, 'i18n-smell.config.mjs'),
      '--baseline',
      baseline,
      '--update-baseline',
    ]);
    assert.equal(update.status, 0, update.stderr);
    const before = parseIssuesJson(await readFile(baseline, 'utf8')).issues.find((issue) => issue.value === 'Save');
    assert.ok(before);
    assert.ok(before.id?.startsWith('hardcoded:v3:'));

    const componentPath = path.join(tempDir, 'src/components/UserPanel.vue');
    const component = await readFile(componentPath, 'utf8');
    await writeFile(componentPath, component.replace('    <button>Save', '\n    <button>Save'));

    const result = run([
      'check',
      '--config',
      path.join(tempDir, 'i18n-smell.config.mjs'),
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
    const moved = report.issues.find((issue) => issue.check === 'hardcoded' && issue.value === 'Save');
    assert.ok(moved);
    assert.equal(moved.id, before.id);
    assert.equal(moved.reason, 'baseline');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('legacy baseline versions require regeneration', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    await writeBasicProject(tempDir);
    for (const version of [undefined, 1, 2, 3]) {
      await writeFile(baseline, JSON.stringify({ ...(version === undefined ? {} : { version }), issues: [] }));
      const result = run([
        'check',
        '--config',
        path.join(tempDir, 'i18n-smell.config.mjs'),
        '--baseline',
        baseline,
        '--fail-on',
        'none',
      ]);

      assert.equal(result.status, 2);
      assert.match(result.stderr, /must be regenerated with --update-baseline/);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('includeIgnored shows baseline issues', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-baseline-'));
  const baseline = path.join(tempDir, 'baseline.json');

  try {
    const update = run([
      'check',
      '--config',
      'examples/basic/i18n-smell.config.mjs',
      '--baseline',
      baseline,
      '--update-baseline',
    ]);
    assert.equal(update.status, 0, update.stderr);

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
    assert.ok(report.issues.some((issue) => issue.id?.startsWith('identical:v4:') && issue.reason === 'baseline'));
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
