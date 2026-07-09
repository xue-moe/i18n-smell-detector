import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCombinedReport } from '../src/reporters/combined.js';
import { renderMarkdownReport } from '../src/reporters/markdown.js';

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

test('Markdown output escapes table cell separators and backslashes', () => {
  const report = renderMarkdownReport([
    {
      key: 'home.path',
      baseLocale: 'en',
      targetLocale: 'zh',
      value: 'C:\\docs|title *bold* _em_ `code` [link]',
      severity: 'high',
      reason: 'line one\nline two',
    },
  ], {
    heading: 'Identical translations',
    includeIgnored: false,
  });

  assert.ok(report.includes("C:\\\\docs\\|title \\*bold\\* \\_em\\_ \\`code\\` \\[link\\]"));
  assert.match(report, /line one line two/);
});
