import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

test('combined SARIF output includes rules, locations, and stable ids', () => {
  const result = spawnSync(process.execPath, [
    bin,
    'check',
    '--config',
    'examples/basic/i18n-smell.config.mjs',
    '--format',
    'sarif',
    '--fail-on',
    'none',
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const [run] = report.runs;

  assert.equal(report.version, '2.1.0');
  assert.equal(run.tool.driver.name, 'i18n-smell-detector');
  assert.ok(run.tool.driver.rules.length > 0);
  assert.ok(run.results.some((issue) => issue.ruleId.startsWith('i18n-smell/identical/')));
  assert.ok(run.results.some((issue) => issue.locations?.[0]?.physicalLocation?.artifactLocation?.uri.endsWith('.vue')));
  assert.ok(run.results.every((issue) => issue.partialFingerprints?.stableId));
});
