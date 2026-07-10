import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCombinedReport } from '../dist/reporters/combined.js';
import { renderHtmlReport } from '../dist/reporters/html.js';

test('HTML output renders summary and escapes issue values', () => {
  const report = renderHtmlReport(
    [
      {
        check: 'hardcoded',
        heading: 'Hardcoded strings',
        title: 'hardcoded strings',
        emptyMessage: 'No hardcoded strings found.',
        issues: [
          {
            file: 'src/App.vue',
            line: 3,
            column: 9,
            value: '<Save & close>',
            severity: 'high',
            reason: 'static template text',
            kind: 'vue-text',
          },
        ],
      },
    ],
    { includeIgnored: false },
  );

  assert.match(report, /<!doctype html>/);
  assert.match(report, /Hardcoded strings/);
  assert.match(report, /&lt;Save &amp; close&gt;/);
  assert.doesNotMatch(report, /<Save & close>/);
});

test('combined report supports html format', () => {
  const report = renderCombinedReport(
    [
      {
        check: 'placeholders',
        heading: 'Placeholder mismatches',
        title: 'placeholder mismatches',
        emptyMessage: 'No placeholder mismatches found.',
        issues: [],
      },
    ],
    { format: 'html', includeIgnored: false },
  );

  assert.match(report, /i18n-smell-detector report/);
  assert.match(report, /No placeholder mismatches found\./);
});
