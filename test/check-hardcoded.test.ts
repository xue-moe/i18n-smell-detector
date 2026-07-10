import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { checkHardcodedStrings } from '../dist/check-hardcoded.js';
import { renderJsonReport } from '../dist/reporters/json.js';
import { renderMarkdownReport } from '../dist/reporters/markdown.js';

const fixtureDir = path.resolve('test/fixtures/hardcoded');

const config = {
  source: ['basic.vue', 'attributes.vue', 'ignored.vue', 'dynamic.vue'],
  hardcoded: {
    vueAttributes: ['placeholder', 'title', 'alt', 'aria-label', 'aria-description'],
    ignoreValues: ['OK'],
    ignorePatterns: [/^v\d+$/],
  },
};

test('checkHardcodedStrings detects Vue template text and attributes', async () => {
  const issues = await checkHardcodedStrings(config, fixtureDir);
  const visible = issues.filter((issue) => issue.severity !== 'ignored');

  assert.ok(
    visible.some(
      (issue) => issue.file === 'basic.vue' && issue.value === 'Profile settings' && issue.severity === 'high',
    ),
  );
  assert.ok(
    visible.some((issue) => issue.file === 'basic.vue' && issue.value === 'Save' && issue.severity === 'medium'),
  );
  assert.ok(
    visible.some(
      (issue) =>
        issue.file === 'attributes.vue' && issue.kind === 'vue-attribute:placeholder' && issue.value === 'Search',
    ),
  );
  assert.ok(
    visible.some(
      (issue) =>
        issue.file === 'attributes.vue' && issue.kind === 'vue-attribute:title' && issue.value === 'Search users',
    ),
  );
});

test('checkHardcodedStrings includes ignored findings when requested by reports', async () => {
  const issues = await checkHardcodedStrings(config, fixtureDir);
  const ignored = issues.filter((issue) => issue.severity === 'ignored');

  assert.ok(ignored.some((issue) => issue.value === 'OK' && issue.reason === 'ignored value'));
  assert.ok(ignored.some((issue) => issue.value === 'v2' && issue.reason === 'ignored pattern'));
  assert.ok(ignored.some((issue) => issue.value === '#ffffff' && issue.reason === 'non-user-facing value'));
});

test('hardcoded JSON and Markdown output include location fields', async () => {
  const issues = await checkHardcodedStrings({ ...config, source: ['basic.vue'] }, fixtureDir);
  const report = JSON.parse(renderJsonReport(issues, { includeIgnored: false }));
  const markdown = renderMarkdownReport(issues, {
    includeIgnored: false,
    heading: 'Hardcoded strings',
  });

  assert.equal(typeof report.issues[0].file, 'string');
  assert.equal(typeof report.issues[0].line, 'number');
  assert.equal(typeof report.issues[0].column, 'number');
  assert.match(markdown, /# Hardcoded strings/);
  assert.match(markdown, /\| Level \| Location \| Value \| Reason \|/);
});

test('checkHardcodedStrings reports malformed Vue files clearly', async () => {
  await assert.rejects(() => checkHardcodedStrings({ ...config, source: ['broken.vue'] }, fixtureDir), /Malformed Vue/);
});

test('checkHardcodedStrings reports empty source globs clearly', async () => {
  await assert.rejects(
    () => checkHardcodedStrings({ ...config, source: ['missing/**/*.vue'] }, fixtureDir),
    /No source files matched/,
  );
});
