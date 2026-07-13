import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHardcoded } from '../dist/rules/classify-hardcoded.js';

test('classifyHardcoded distinguishes technical identifiers from user-facing labels', () => {
  for (const value of [
    'APP_SECRET_TOKEN',
    'internal_record_key',
    'pk_example_123',
    'MODEL-100',
    '550e8400-e29b-41d4-a716-446655440000',
  ]) {
    assert.deepEqual(classifyHardcoded(value), {
      severity: 'low',
      confidence: 'low',
      category: 'technical-identifier',
      reason: 'technical identifier',
    });
  }

  for (const value of ['SAVE', 'LOGIN', 'ERROR', 'DELETE', 'CANCEL']) {
    assert.deepEqual(classifyHardcoded(value), {
      severity: 'medium',
      confidence: 'medium',
      category: 'natural-language',
      reason: 'single word',
    });
  }

  for (const value of ['Payment failed', 'Invalid email']) {
    assert.deepEqual(classifyHardcoded(value), {
      severity: 'high',
      confidence: 'high',
      category: 'natural-language',
      reason: 'sentence-like content',
    });
  }
});

test('classifyHardcoded uses source context and configured technical terms', () => {
  assert.equal(classifyHardcoded('PROTOCOL_X', {}, { elementName: 'code' }).confidence, 'low');
  assert.deepEqual(classifyHardcoded('AcmeProtocol', { hardcoded: { technicalTerms: ['AcmeProtocol'] } }), {
    severity: 'low',
    confidence: 'low',
    category: 'technical-identifier',
    reason: 'configured technical term',
  });
});

test('classifyHardcoded does not treat arbitrary underscore content as an identifier', () => {
  assert.notEqual(classifyHardcoded('Save_as draft').reason, 'technical identifier');
  assert.notEqual(classifyHardcoded('report_final.pdf').reason, 'technical identifier');
});
