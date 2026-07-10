import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('basic example runs successfully', () => {
  const result = spawnSync('npm', ['run', 'example:basic'], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /identical translations/);
  assert.match(result.stdout, /hardcoded strings/);
});
