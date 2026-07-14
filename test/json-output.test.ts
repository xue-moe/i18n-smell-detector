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
          reason: 'copied base-locale phrase',
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

test('renderJsonReport preserves source ranges and AST context', () => {
  const report = JSON.parse(
    renderJsonReport(
      [
        {
          file: 'src/App.vue',
          line: 2,
          column: 9,
          value: 'Save',
          severity: 'medium',
          reason: 'static template text',
          kind: 'vue-text',
          range: {
            start: { line: 2, column: 9, offset: 19 },
            end: { line: 2, column: 13, offset: 23 },
          },
          nodeType: 'Text',
          parentNodeType: 'Element',
          containsInterpolation: false,
        },
      ],
      { includeIgnored: false },
    ),
  );

  assert.deepEqual(report.issues[0].range, {
    start: { line: 2, column: 9, offset: 19 },
    end: { line: 2, column: 13, offset: 23 },
  });
  assert.equal(report.issues[0].nodeType, 'Text');
  assert.equal(report.issues[0].parentNodeType, 'Element');
  assert.equal(report.issues[0].containsInterpolation, false);
});
