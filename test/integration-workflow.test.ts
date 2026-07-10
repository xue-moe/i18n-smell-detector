import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });
}

test('full CLI workflow initializes config and writes an HTML report', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-integration-'));

  try {
    await mkdir(path.join(tempDir, 'src/locales'), { recursive: true });
    await mkdir(path.join(tempDir, 'src/components'), { recursive: true });
    await writeFile(
      path.join(tempDir, 'src/locales/en.json'),
      JSON.stringify({
        home: {
          title: 'Welcome back',
          greeting: 'Hello {name}',
        },
      }),
    );
    await writeFile(
      path.join(tempDir, 'src/locales/zh-Hans.json'),
      JSON.stringify({
        home: {
          title: 'Welcome back',
          greeting: '你好',
        },
      }),
    );
    await writeFile(path.join(tempDir, 'src/components/Home.vue'), '<template><h1>Profile settings</h1></template>');

    const init = run(['init'], tempDir);
    assert.equal(init.status, 0, init.stderr);
    const config = await readFile(path.join(tempDir, 'i18n-smell.config.mjs'), 'utf8');
    assert.match(config, /["']zh-Hans["']: '.\/src\/locales\/zh-Hans\.json'/);

    const check = run(['check', '--format', 'html', '--output', 'reports/i18n.html', '--fail-on', 'none'], tempDir);
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /Report written to reports\/i18n\.html/);

    const report = await readFile(path.join(tempDir, 'reports/i18n.html'), 'utf8');
    assert.match(report, /i18n-smell-detector report/);
    assert.match(report, /Profile settings/);
    assert.match(report, /missing: \{name\}/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
