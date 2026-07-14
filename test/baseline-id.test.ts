import test from 'node:test';
import assert from 'node:assert/strict';
import { issueId } from '../dist/baseline.js';
import type { IdenticalIssue, PlaceholderIssue } from '../dist/types.js';

function identical(value: string): IdenticalIssue {
  return {
    key: 'greeting',
    baseLocale: 'en',
    targetLocale: 'fr',
    value,
    severity: 'high',
    reason: 'copied base-locale phrase',
  };
}

function placeholders(missing: string[], extra: string[] = []): PlaceholderIssue {
  return {
    key: 'greeting',
    baseLocale: 'en',
    targetLocale: 'fr',
    value: 'Bonjour',
    missing,
    extra,
    severity: 'high',
    reason: 'missing placeholder',
  };
}

test('identical baseline IDs change with normalized defect content', () => {
  assert.notEqual(issueId('identical', identical('Hello')), issueId('identical', identical('Welcome')));
  assert.equal(issueId('identical', identical('  Hello\nworld  ')), issueId('identical', identical('Hello world')));
});

test('placeholder baseline IDs change with missing and extra placeholders', () => {
  assert.notEqual(
    issueId('placeholders', placeholders(['{name}'])),
    issueId('placeholders', placeholders(['{count}'])),
  );
  assert.notEqual(
    issueId('placeholders', placeholders(['{name}'])),
    issueId('placeholders', placeholders(['{name}', '{name}'])),
  );
  assert.notEqual(
    issueId('placeholders', placeholders(['{name}'])),
    issueId('placeholders', placeholders(['{name}'], ['{unused}'])),
  );
});

test('placeholder baseline IDs are independent of placeholder ordering', () => {
  assert.equal(
    issueId('placeholders', placeholders(['{name}', '{count}'], ['{extra}', '{other}'])),
    issueId('placeholders', placeholders(['{count}', '{name}'], ['{other}', '{extra}'])),
  );
});
