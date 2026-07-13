import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHardcoded } from '../dist/rules/classify-hardcoded.js';

test('classifyHardcoded distinguishes technical identifiers from user-facing labels', () => {
  for (const value of ['APP_SECRET_TOKEN', 'internal_record_key', 'pk_example_123']) {
    assert.deepEqual(classifyHardcoded(value), {
      severity: 'ignored',
      reason: 'technical identifier',
    });
  }

  for (const value of ['SAVE', 'LOGIN']) {
    assert.deepEqual(classifyHardcoded(value), {
      severity: 'medium',
      reason: 'single word',
    });
  }

  for (const value of ['Payment failed', 'Invalid email']) {
    assert.deepEqual(classifyHardcoded(value), {
      severity: 'high',
      reason: 'sentence-like content',
    });
  }
});

test('classifyHardcoded does not treat arbitrary underscore content as an identifier', () => {
  assert.notEqual(classifyHardcoded('Save_as draft').reason, 'technical identifier');
  assert.notEqual(classifyHardcoded('report_final.pdf').reason, 'technical identifier');
});
