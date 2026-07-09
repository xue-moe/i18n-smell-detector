import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
