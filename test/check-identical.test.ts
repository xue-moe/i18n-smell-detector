import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIdenticalTranslations } from '../dist/check-identical.js';

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
    config,
  );

  const visible = issues.filter((issue) => issue.severity !== 'ignored');
  assert.equal(visible.find((issue) => issue.key === 'home.welcome')?.severity, 'high');
  assert.equal(visible.find((issue) => issue.key === 'common.cancel')?.severity, 'medium');
  assert.equal(issues.find((issue) => issue.key === 'brand.name')?.severity, 'ignored');
  assert.equal(issues.find((issue) => issue.key === 'common.ok')?.severity, 'ignored');
  assert.equal(issues.find((issue) => issue.targetLocale === 'en-GB')?.severity, 'ignored');
});

test('checkIdenticalTranslations recognizes Unicode letter words', () => {
  const issues = checkIdenticalTranslations(
    {
      en: {
        'profile.bio': 'Résumé naïve',
      },
      zh: {
        'profile.bio': 'Résumé naïve',
      },
    },
    config,
  );

  assert.equal(issues[0].severity, 'high');
  assert.equal(issues[0].reason, 'copied English phrase');
});

test('checkIdenticalTranslations applies categorized do-not-translate rules with metadata', () => {
  const issues = checkIdenticalTranslations(
    {
      en: { 'product.name': 'PRODUCT_X', 'technical.model': 'MODEL-100', 'home.title': 'Welcome back' },
      zh: { 'product.name': 'PRODUCT_X', 'technical.model': 'MODEL-100', 'home.title': 'Welcome back' },
    },
    {
      ...config,
      doNotTranslate: [
        { values: ['PRODUCT_X'], category: 'product-name', reason: 'Official terminology', owner: 'l10n' },
        { keys: [/^technical\./], values: [/^MODEL-\d+$/], category: 'technical-term', reason: 'Protocol term' },
      ],
    },
  );

  assert.equal(issues.find((issue) => issue.key === 'product.name')?.suppression?.category, 'product-name');
  assert.equal(issues.find((issue) => issue.key === 'technical.model')?.suppression?.reason, 'Protocol term');
  assert.equal(issues.find((issue) => issue.key === 'home.title')?.severity, 'high');
});
