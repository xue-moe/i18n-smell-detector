import test from 'node:test';
import assert from 'node:assert/strict';
import { scanVueTemplate } from '../src/source/scan-vue-template.js';

const config = {
  hardcoded: {
    vueAttributes: ['placeholder', 'title', 'alt', 'aria-label', 'aria-description'],
    ignoreValues: [],
    ignorePatterns: [],
  },
};

test('scanVueTemplate detects text nodes and static attributes', () => {
  const issues = scanVueTemplate(
    '<button title="Open menu">Save</button><input placeholder="Search" />',
    { file: 'Component.vue', config }
  ).filter((issue) => issue.severity !== 'ignored');

  assert.deepEqual(issues.map((issue) => [issue.kind, issue.value]), [
    ['vue-attribute:title', 'Open menu'],
    ['vue-text', 'Save'],
    ['vue-attribute:placeholder', 'Search'],
  ]);
});

test('scanVueTemplate ignores dynamic bindings and i18n expressions', () => {
  const issues = scanVueTemplate(
    '<input :placeholder="label" placeholder="$t(\'search\')" /><button>{{ label }}</button>',
    { file: 'Component.vue', config }
  );

  assert.equal(issues.filter((issue) => issue.severity !== 'ignored').length, 0);
});

test('scanVueTemplate skips whitespace-only text nodes', () => {
  const issues = scanVueTemplate(
    '<section>\n  <span>Search</span>\n</section>',
    { file: 'Component.vue', config }
  );

  assert.deepEqual(issues.map((issue) => issue.value), ['Search']);
});
