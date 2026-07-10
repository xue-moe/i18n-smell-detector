import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const bin = path.resolve('bin/i18n-smell-detector.js');

function runReport(format: 'json' | 'markdown') {
  const result = spawnSync(
    process.execPath,
    [bin, 'check', '--config', 'examples/basic/i18n-smell.config.mjs', '--format', format, '--fail-on', 'none'],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('combined JSON output matches snapshot', async () => {
  const actual = `${JSON.stringify(JSON.parse(runReport('json')), null, 2)}\n`;
  const expected = await readFile('test/snapshots/combined-json.snap.json', 'utf8');

  assert.equal(actual, expected);
});

test('combined Markdown output matches snapshot', async () => {
  const actual = runReport('markdown');
  const expected = await readFile('test/snapshots/combined-markdown.snap.md', 'utf8');

  assert.equal(actual, expected);
});
