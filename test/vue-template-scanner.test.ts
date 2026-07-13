import test from 'node:test';
import assert from 'node:assert/strict';
import { scanExpressionStrings } from '../dist/source/scan-expression-strings.js';
import { scanVueTemplate } from '../dist/source/scan-vue-template.js';

const config = {
  hardcoded: {
    vueAttributes: ['placeholder', 'title', 'alt', 'aria-label', 'aria-description'],
    ignoreValues: [],
    ignorePatterns: [],
  },
};

test('scanVueTemplate detects text nodes and static attributes', () => {
  const issues = scanVueTemplate('<button title="Open menu">Save</button><input placeholder="Search" />', {
    file: 'Component.vue',
    config,
  }).filter((issue) => issue.severity !== 'ignored');

  assert.deepEqual(
    issues.map((issue) => [issue.kind, issue.value]),
    [
      ['vue-attribute:title', 'Open menu'],
      ['vue-text', 'Save'],
      ['vue-attribute:placeholder', 'Search'],
    ],
  );

  const title = issues.find((issue) => issue.value === 'Open menu');
  assert.deepEqual(title?.range, {
    start: { line: 1, column: 15, offset: 14 },
    end: { line: 1, column: 26, offset: 25 },
  });
  assert.equal(title?.nodeType, 'Attribute');
  assert.equal(title?.parentNodeType, 'Element');
  assert.equal(title?.containsInterpolation, false);

  const text = issues.find((issue) => issue.value === 'Save');
  assert.deepEqual(text?.range, {
    start: { line: 1, column: 27, offset: 26 },
    end: { line: 1, column: 31, offset: 30 },
  });
  assert.equal(text?.nodeType, 'Text');
  assert.equal(text?.parentNodeType, 'Element');
});

test('scanVueTemplate ignores dynamic bindings and i18n expressions', () => {
  const issues = scanVueTemplate(
    '<input :placeholder="label" placeholder="$t(\'search\')" /><button>{{ label }}</button>',
    { file: 'Component.vue', config },
  );

  assert.equal(issues.filter((issue) => issue.severity !== 'ignored').length, 0);
});

test('scanVueTemplate skips whitespace-only text nodes', () => {
  const issues = scanVueTemplate('<section>\n  <span>Search</span>\n</section>', { file: 'Component.vue', config });

  assert.deepEqual(
    issues.map((issue) => issue.value),
    ['Search'],
  );
});

test('scanVueTemplate recognizes Unicode letter text', () => {
  const issues = scanVueTemplate('<section><p>Résumé naïve</p><button>保存</button></section>', {
    file: 'Component.vue',
    config,
  }).filter((issue) => issue.severity !== 'ignored');

  assert.equal(issues.find((issue) => issue.value === 'Résumé naïve')?.severity, 'high');
  assert.equal(issues.find((issue) => issue.value === '保存')?.severity, 'low');
});

test('scanExpressionStrings supports the selected expression forms', () => {
  assert.deepEqual(
    scanExpressionStrings("loading ? 'Loading...' : 'Ready'").map(({ value, expressionKind }) => ({
      value,
      expressionKind,
    })),
    [
      { value: 'Loading...', expressionKind: 'ConditionalExpression' },
      { value: 'Ready', expressionKind: 'ConditionalExpression' },
    ],
  );
  assert.deepEqual(
    scanExpressionStrings("enabled && ('Enabled')").map((finding) => finding.value),
    ['Enabled'],
  );
  assert.deepEqual(
    scanExpressionStrings('`Hello ${name}!`').map(({ value, containsInterpolation }) => ({
      value,
      containsInterpolation,
    })),
    [
      { value: 'Hello ', containsInterpolation: true },
      { value: '!', containsInterpolation: true },
    ],
  );
});

test('scanVueTemplate detects strings in interpolations and bound attributes', () => {
  const template =
    `<p>{{ loading ? 'Loading...' : 'Ready' }}</p>` +
    `<StatusPill :label="enabled ? 'Enabled' : 'Disabled'" :title="\`Hello \${name}\`" />`;
  const issues = scanVueTemplate(template, { file: 'Component.vue', config });
  const visible = issues.filter((issue) => issue.severity !== 'ignored');

  assert.deepEqual(
    visible.map((issue) => [issue.kind, issue.value]),
    [
      ['vue-interpolation', 'Loading...'],
      ['vue-interpolation', 'Ready'],
      ['vue-bind:label', 'Enabled'],
      ['vue-bind:label', 'Disabled'],
      ['vue-bind:title', 'Hello'],
    ],
  );

  const loading = visible.find((issue) => issue.value === 'Loading...');
  assert.equal(loading?.range?.start.offset, template.indexOf("'Loading...'"));
  assert.equal(loading?.nodeType, 'StringLiteral');
  assert.equal(loading?.parentNodeType, 'ConditionalExpression');

  const hello = visible.find((issue) => issue.value === 'Hello');
  assert.equal(hello?.containsInterpolation, true);
  assert.equal(hello?.nodeType, 'TemplateElement');
});
