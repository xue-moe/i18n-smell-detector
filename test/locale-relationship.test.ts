import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyIdentical } from '../dist/rules/classify-identical.js';

const config = {
  ignoreSameLanguageFamily: true,
  ignoreCodeLike: false,
  placeholderPatterns: [],
};

function classify(baseLocale: string, targetLocale: string) {
  return classifyIdentical({
    key: 'message.welcome',
    value: 'Welcome back',
    baseLocale,
    targetLocale,
    config,
  });
}

for (const [baseLocale, targetLocale] of [
  ['zh-Hans', 'zh-Hant'],
  ['zh-CN', 'zh-TW'],
  ['sr-Latn', 'sr-Cyrl'],
] as const) {
  test(`${baseLocale} and ${targetLocale} are detected when scripts differ`, () => {
    const result = classify(baseLocale, targetLocale);
    assert.notEqual(result.severity, 'ignored');
    assert.notEqual(result.severity, 'low');
  });
}

for (const [baseLocale, targetLocale] of [
  ['en-US', 'en-GB'],
  ['pt-BR', 'pt-PT'],
  ['zh-CN', 'zh-SG'],
] as const) {
  test(`${baseLocale} and ${targetLocale} are low severity when only regions differ`, () => {
    assert.deepEqual(classify(baseLocale, targetLocale), {
      severity: 'low',
      reason: 'same language and script with different explicit regions',
    });
  });
}

for (const [baseLocale, targetLocale] of [
  ['en', 'en-US'],
  ['en-US', 'en'],
  ['pt', 'pt-BR'],
  ['zh-Hans', 'zh-CN'],
] as const) {
  test(`${baseLocale} and ${targetLocale} are ignored without two explicit different regions`, () => {
    assert.deepEqual(classify(baseLocale, targetLocale), {
      severity: 'ignored',
      reason: 'same language and script',
    });
  });
}

test('ignoreSameLanguageFamily false disables locale adjustment', () => {
  const result = classifyIdentical({
    key: 'message.welcome',
    value: 'Welcome back',
    baseLocale: 'en-US',
    targetLocale: 'en-GB',
    config: { ...config, ignoreSameLanguageFamily: false },
  });

  assert.equal(result.severity, 'high');
});

test('invalid locale tags fall back without throwing', () => {
  assert.doesNotThrow(() => classify('custom_SOURCE', 'custom_TARGET'));
});

test('explicit technical rules take precedence over locale adjustment', () => {
  const result = classifyIdentical({
    key: 'developer.api',
    value: 'API',
    baseLocale: 'en-US',
    targetLocale: 'en-GB',
    config: { ...config, ignoreCodeLike: true },
  });

  assert.deepEqual(result, { severity: 'ignored', reason: 'code-like value' });
});
