import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIdenticalTranslations } from '../src/check-identical.js';

const baseConfig = {
  baseLocale: 'en',
  locales: {},
  allowIdenticalKeys: [],
  allowIdenticalValues: [],
  placeholderPatterns: [/\{[^}]+\}/g, /\{\{[^}]+\}\}/g],
  ignoreSameLanguageFamily: true,
  trimWhitespace: true,
  ignoreCase: false,
};

test('checkIdenticalTranslations ignores code-like values by default', () => {
  const issues = checkIdenticalTranslations(
    {
      en: { path: '/api/list' },
      zh: { path: '/api/list' },
    },
    { ...baseConfig, ignoreCodeLike: true }
  );

  assert.equal(issues[0].severity, 'ignored');
  assert.equal(issues[0].reason, 'code-like value');
});

test('checkIdenticalTranslations reports code-like values when ignoreCodeLike is false', () => {
  const issues = checkIdenticalTranslations(
    {
      en: { path: '/api/list' },
      zh: { path: '/api/list' },
    },
    { ...baseConfig, ignoreCodeLike: false }
  );

  assert.notEqual(issues[0].severity, 'ignored');
});
