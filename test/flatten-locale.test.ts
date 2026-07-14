import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenLocale } from '../dist/locale/flatten-locale.js';

test('flattenLocale returns dot-path string leaves', () => {
  assert.deepEqual(flattenLocale({ home: { welcome: 'Welcome back' }, list: ['A', { item: 'B' }] }), {
    'home.welcome': 'Welcome back',
    'list.0': 'A',
    'list.1.item': 'B',
  });
});

test('flattenLocale rejects flattened key collisions', () => {
  assert.throws(
    () => flattenLocale({ 'user.name': 'A', user: { name: 'B' } }),
    /Flattened locale key collision at "user\.name"/,
  );
});

test('flattenLocale reports unsupported leaves with their paths', () => {
  assert.throws(
    () => flattenLocale({ settings: { retryCount: 3 } }),
    /Unsupported locale value at "settings\.retryCount": expected a string; received number/,
  );
  assert.throws(
    () => flattenLocale({ enabled: true }),
    /Unsupported locale value at "enabled": expected a string; received boolean/,
  );
  assert.throws(
    () => flattenLocale({ empty: null }),
    /Unsupported locale value at "empty": expected a string; received null/,
  );
});
