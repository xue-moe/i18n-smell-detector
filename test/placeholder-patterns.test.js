import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIdenticalTranslations } from '../src/check-identical.js';

const baseConfig = {
  baseLocale: 'en',
  locales: {},
  allowIdenticalKeys: [],
  allowIdenticalValues: [],
  placeholderPatterns: [/\{\{[^}]+\}\}/g, /%\([^)]+\)[sdif]/g, /\{[^}]+\}/g, /%[sdif]/g],
  ignoreCodeLike: true,
  ignoreSameLanguageFamily: true,
  trimWhitespace: true,
  ignoreCase: false,
};

test('checkIdenticalTranslations ignores default and custom placeholder-only values', () => {
  const issues = checkIdenticalTranslations(
    {
      en: {
        count: '{count}',
        spaced: '{{ count }}',
        printf: '%s',
        named: '%(name)s',
      },
      zh: {
        count: '{count}',
        spaced: '{{ count }}',
        printf: '%s',
        named: '%(name)s',
      },
    },
    baseConfig
  );

  assert.equal(issues.length, 4);
  assert.deepEqual(new Set(issues.map((issue) => issue.severity)), new Set(['ignored']));
  assert.deepEqual(new Set(issues.map((issue) => issue.reason)), new Set(['placeholder only']));
});

test('checkIdenticalTranslations does not ignore mixed placeholder content', () => {
  const issues = checkIdenticalTranslations(
    {
      en: { total: 'Total: {count}' },
      zh: { total: 'Total: {count}' },
    },
    baseConfig
  );

  assert.equal(issues[0].severity, 'high');
});
