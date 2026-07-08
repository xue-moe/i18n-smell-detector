import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCombinedReport } from '../src/reporters/combined.js';

test('combined Markdown output groups checks with a summary table', () => {
  const report = renderCombinedReport([
    {
      check: 'identical',
      heading: 'Identical translations',
      emptyMessage: 'No copied base-locale values found.',
      issues: [
        {
          key: 'home.title',
          baseLocale: 'en',
          targetLocale: 'zh',
          value: 'Welcome back',
          severity: 'high',
          reason: 'copied English phrase',
        },
      ],
    },
    {
      check: 'hardcoded',
      heading: 'Hardcoded strings',
      emptyMessage: 'No hardcoded strings found.',
      issues: [],
    },
  ], { format: 'markdown', includeIgnored: false });

  assert.match(report, /# i18n-smell-detector report/);
  assert.match(report, /\| Check \| High \| Medium \| Low \| Ignored \|/);
  assert.match(report, /## Identical translations/);
  assert.match(report, /## Hardcoded strings/);
  assert.match(report, /No hardcoded strings found\./);
});
