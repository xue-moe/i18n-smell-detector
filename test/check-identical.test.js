import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIdenticalTranslations } from '../src/check-identical.js';

const config = {
  baseLocale: 'en',
  locales: {},
  allowIdenticalKeys: ['brand.*'],
  allowIdenticalValues: ['OK'],
  ignoreSameLanguageFamily: true,
  trimWhitespace: true,
  ignoreCase: false,
};

test('checkIdenticalTranslations classifies copied English text', () => {
  const issues = checkIdenticalTranslations(
    {
      en: {
        'brand.name': 'ExampleApp',
        'common.ok': 'OK',
        'home.welcome': 'Welcome back',
        'common.cancel': 'Cancel',
      },
      zh: {
        'brand.name': 'ExampleApp',
        'common.ok': 'OK',
        'home.welcome': 'Welcome back',
        'common.cancel': 'Cancel',
      },
      'en-GB': {
        'home.welcome': 'Welcome back',
      },
    },
    config
  );

  const visible = issues.filter((issue) => issue.severity !== 'ignored');
  assert.equal(visible.find((issue) => issue.key === 'home.welcome')?.severity, 'high');
  assert.equal(visible.find((issue) => issue.key === 'common.cancel')?.severity, 'medium');
  assert.equal(issues.find((issue) => issue.key === 'brand.name')?.severity, 'ignored');
  assert.equal(issues.find((issue) => issue.key === 'common.ok')?.severity, 'ignored');
  assert.equal(issues.find((issue) => issue.targetLocale === 'en-GB')?.severity, 'ignored');
});
