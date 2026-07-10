import test from 'node:test';
import assert from 'node:assert/strict';
import { flattenLocale } from '../dist/locale/flatten-locale.js';

test('flattenLocale returns dot-path string leaves', () => {
  assert.deepEqual(flattenLocale({ home: { welcome: 'Welcome back' }, list: ['A', { item: 'B' }], count: 1 }), {
    'home.welcome': 'Welcome back',
    'list.0': 'A',
    'list.1.item': 'B',
  });
});
