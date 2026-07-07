import test from 'node:test';
import assert from 'node:assert/strict';
import { checkIdenticalTranslations } from '../src/check-identical.js';

const config = {
  baseLocale: 'en',
  locales: {},
  allowIdenticalKeys: ['brand.*', /^protocol\./],
  allowIdenticalValues: ['OK', /^HTTP\/\d(\.\d)?$/],
  placeholderPatterns: [/\{[^}]+\}/g, /\{\{[^}]+\}\}/g],
  ignoreCodeLike: true,
  ignoreSameLanguageFamily: true,
  trimWhitespace: true,
  ignoreCase: false,
};

test('checkIdenticalTranslations supports wildcard and RegExp key allowlists', () => {
  const issues = checkIdenticalTranslations(
    {
      en: {
        'brand.name': 'ExampleApp',
        'protocol.version': 'Version',
        'home.title': 'Welcome',
      },
      zh: {
        'brand.name': 'ExampleApp',
        'protocol.version': 'Version',
        'home.title': 'Welcome',
      },
    },
    config
  );

  assert.equal(issues.find((issue) => issue.key === 'brand.name')?.reason, 'allowed key');
  assert.equal(issues.find((issue) => issue.key === 'protocol.version')?.reason, 'allowed key');
  assert.equal(issues.find((issue) => issue.key === 'home.title')?.severity, 'medium');
});

test('checkIdenticalTranslations supports exact and RegExp value allowlists', () => {
  const issues = checkIdenticalTranslations(
    {
      en: {
        ok: 'OK',
        http: 'HTTP/2',
        save: 'Save',
      },
      zh: {
        ok: 'OK',
        http: 'HTTP/2',
        save: 'Save',
      },
    },
    config
  );

  assert.equal(issues.find((issue) => issue.key === 'ok')?.reason, 'allowed value');
  assert.equal(issues.find((issue) => issue.key === 'http')?.reason, 'allowed value');
  assert.equal(issues.find((issue) => issue.key === 'save')?.severity, 'medium');
});
