import test from 'node:test';
import assert from 'node:assert/strict';
import { renderJsonReport } from '../dist/reporters/json.js';

test('renderJsonReport includes summary and keeps issue fields', () => {
  const report = JSON.parse(
    renderJsonReport(
      [
        {
          key: 'home.welcome',
          baseLocale: 'en',
          targetLocale: 'zh',
          value: 'Welcome back',
          severity: 'high',
          reason: 'copied English phrase',
        },
        {
          key: 'brand.name',
          baseLocale: 'en',
          targetLocale: 'zh',
          value: 'ExampleApp',
          severity: 'ignored',
          reason: 'allowed key',
        },
      ],
      { includeIgnored: false },
    ),
  );

  assert.deepEqual(report.summary, { high: 1, medium: 0, low: 0, ignored: 1 });
  assert.deepEqual(Object.keys(report.issues[0]), ['key', 'baseLocale', 'targetLocale', 'value', 'severity', 'reason']);
  assert.equal(report.issues.length, 1);
});
