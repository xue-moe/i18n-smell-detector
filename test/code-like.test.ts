import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIdenticalTranslations } from '../dist/check-identical.js';

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

function classify(key: string, value: string) {
  const issues = checkIdenticalTranslations(
    { en: { [key]: value }, zh: { [key]: value } },
    { ...baseConfig, ignoreCodeLike: true },
  );
  assert.equal(issues.length, 1);
  return issues[0];
}

test('checkIdenticalTranslations ignores code-like values by default', () => {
  const issues = checkIdenticalTranslations(
    {
      en: { path: '/api/list' },
      zh: { path: '/api/list' },
    },
    { ...baseConfig, ignoreCodeLike: true },
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
    { ...baseConfig, ignoreCodeLike: false },
  );

  assert.notEqual(issues[0].severity, 'ignored');
});

for (const [key, value] of [
  ['button.save', 'save'],
  ['button.save', 'SAVE'],
  ['common.login', 'login'],
  ['status.error', 'error'],
  ['action.delete', 'DELETE'],
] as const) {
  test(`${key}=${value} is reported as UI text`, () => {
    const result = classify(key, value);
    assert.notEqual(result.severity, 'ignored');
  });
}

for (const [key, value] of [
  ['developer.api', 'API'],
  ['network.http', 'HTTP'],
  ['developer.sdk', 'SDK'],
  ['model.name', 'MODEL-100'],
  ['endpoint.users', '/api/v1/users'],
] as const) {
  test(`${key}=${value} is ignored as technical content`, () => {
    const result = classify(key, value);
    assert.equal(result.severity, 'ignored');
  });
}

for (const [key, value] of [
  ['dialog.ok', 'OK'],
  ['common.yes', 'YES'],
  ['settings.off', 'OFF'],
] as const) {
  test(`${key}=${value} uses the short UI label rule`, () => {
    const result = classify(key, value);
    assert.equal(result.severity, 'low');
  });
}
