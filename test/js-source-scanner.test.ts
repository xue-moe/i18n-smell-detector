import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkHardcodedStrings } from '../dist/check-hardcoded.js';
import { loadConfig } from '../dist/config.js';
import { scanJsText } from '../dist/source/scan-js-source.js';

const scanConfig = {
  hardcoded: {
    functions: ['toast.success'],
    jsxAttributes: ['title'],
    ignoreValues: [],
    ignorePatterns: [],
  },
};

async function writeConfig(root: string, extra = '') {
  const configPath = path.join(root, 'i18n-smell.config.mjs');
  await writeFile(
    configPath,
    `
    export default {
      source: ['src/**/*.{js,ts,tsx}'],
      hardcoded: {
        functions: ['toast.success', 'alert', 'confirm'],
        jsxAttributes: ['placeholder', 'title'],
        ${extra}
      }
    };
  `,
  );
  return loadConfig(configPath);
}

test('checkHardcodedStrings detects configured JS and TS function call strings', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-js-'));

  try {
    await mkdir(path.join(tempDir, 'src'), { recursive: true });
    await writeFile(
      path.join(tempDir, 'src/actions.ts'),
      `
      toast.success('Saved changes');
      alert('Invalid input');
      console.log('debug only');
    `,
    );
    const config = await writeConfig(tempDir);
    const issues = await checkHardcodedStrings(config, tempDir);

    assert.ok(issues.some((issue) => issue.kind === 'js-call:toast.success' && issue.value === 'Saved changes'));
    assert.ok(issues.some((issue) => issue.kind === 'js-call:alert' && issue.value === 'Invalid input'));
    assert.equal(
      issues.some((issue) => issue.value === 'debug only'),
      false,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('scanJsText records complete source ranges and AST context', () => {
  const [issue] = scanJsText("toast.success('Saved changes');", {
    file: 'actions.ts',
    config: scanConfig,
  });

  assert.deepEqual(issue.range, {
    start: { line: 1, column: 15, offset: 14 },
    end: { line: 1, column: 30, offset: 29 },
  });
  assert.equal(issue.line, issue.range?.start.line);
  assert.equal(issue.column, issue.range?.start.column);
  assert.equal(issue.nodeType, 'StringLiteral');
  assert.equal(issue.parentNodeType, 'CallExpression');
  assert.equal(issue.containsInterpolation, false);
});

test('scanJsText detects only explicitly configured call, assignment, and property sinks', () => {
  const issues = scanJsText(
    `
      notify('Invalid input', 'debug metadata');
      error.value = 'Network error';
      other.value = 'Internal only';
      toast.add({
        summary: 'Invalid input',
        detail: 'Enter a valid value.',
        debug: 'Stack details'
      });
    `,
    {
      file: 'messages.ts',
      config: {
        hardcoded: {
          functions: [],
          jsxAttributes: [],
          ignoreValues: [],
          ignorePatterns: [],
          sinks: {
            calls: [{ callee: 'notify', arguments: [0] }],
            assignments: ['error.value'],
            properties: ['summary', 'detail'],
          },
        },
      },
    },
  );

  assert.deepEqual(
    issues.map((issue) => [issue.kind, issue.value]),
    [
      ['js-call:notify', 'Invalid input'],
      ['js-assignment:error.value', 'Network error'],
      ['js-property:summary', 'Invalid input'],
      ['js-property:detail', 'Enter a valid value.'],
    ],
  );
  assert.equal(
    issues.some((issue) => issue.value === 'debug metadata'),
    false,
  );
  assert.equal(
    issues.some((issue) => issue.value === 'Internal only'),
    false,
  );
  assert.equal(
    issues.some((issue) => issue.value === 'Stack details'),
    false,
  );
});

test('scanJsText extracts nested sink branches and complete template messages', () => {
  const source = `
    error.value = ok ? error.message : 'Payment failed';
    toast.add({ summary: valid ? 'Ready' : 'Invalid input', detail: message || 'Enter a valid value.' });
    notify(success ? 'Saved successfully' : 'Save failed');
  `;
  const issues = scanJsText(source, {
    file: 'nested.ts',
    config: {
      hardcoded: {
        functions: [],
        jsxAttributes: [],
        ignoreValues: [],
        ignorePatterns: [],
        sinks: {
          calls: [{ callee: 'notify', arguments: [0] }],
          assignments: ['error.value'],
          properties: ['summary', 'detail'],
        },
      },
    },
  });

  assert.deepEqual(
    issues.map((issue) => issue.value),
    ['Payment failed', 'Ready', 'Invalid input', 'Enter a valid value.', 'Saved successfully', 'Save failed'],
  );
});

test('scanJsText reports an interpolated template as one message candidate', () => {
  const source = 'notify(`Delete item "${key}"?`);';
  const issues = scanJsText(source, {
    file: 'template.ts',
    config: {
      hardcoded: {
        functions: [],
        jsxAttributes: [],
        ignoreValues: [],
        ignorePatterns: [],
        sinks: { calls: [{ callee: 'notify', arguments: [0] }], assignments: [], properties: [] },
      },
    },
  });

  assert.equal(issues.length, 1);
  assert.equal(issues[0].value, 'Delete item "{key}"?');
  assert.equal(issues[0].rawValue, '`Delete item "${key}"?`');
  assert.equal(issues[0].containsInterpolation, true);
  assert.equal(issues[0].interpolations?.[0].expression, 'key');
  assert.equal(issues[0].range?.start.offset, source.indexOf('`'));
});

test('checkHardcodedStrings detects JSX text and static attributes', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-jsx-'));

  try {
    await mkdir(path.join(tempDir, 'src'), { recursive: true });
    await writeFile(
      path.join(tempDir, 'src/SearchBox.tsx'),
      `
      export function SearchBox() {
        return <section title="User tools"><button>Save changes</button><input placeholder="Search users" /></section>;
      }
    `,
    );
    const config = await writeConfig(tempDir);
    const issues = await checkHardcodedStrings(config, tempDir);

    assert.ok(issues.some((issue) => issue.kind === 'jsx-text' && issue.value === 'Save changes'));
    assert.ok(issues.some((issue) => issue.kind === 'jsx-attribute:placeholder' && issue.value === 'Search users'));
    assert.ok(issues.some((issue) => issue.kind === 'jsx-attribute:title' && issue.value === 'User tools'));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('checkHardcodedStrings detects configured function calls in Vue script blocks', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-vue-script-'));

  try {
    await mkdir(path.join(tempDir, 'src'), { recursive: true });
    const vueSource = `
      <template><button>Save</button></template>
      <script>
      export default {
        mounted() {
          alert('Invalid input');
        }
      };
      </script>
      <script setup lang="ts">
      toast.success('Saved changes');
      </script>
    `;
    await writeFile(path.join(tempDir, 'src/UserPanel.vue'), vueSource);
    const configPath = path.join(tempDir, 'i18n-smell.config.mjs');
    await writeFile(
      configPath,
      `
      export default {
        source: ['src/**/*.vue'],
        hardcoded: {
          functions: ['toast.success', 'alert']
        }
      };
    `,
    );
    const config = await loadConfig(configPath);
    const issues = await checkHardcodedStrings(config, tempDir);

    assert.ok(issues.some((issue) => issue.kind === 'vue-text' && issue.value === 'Save'));
    assert.ok(issues.some((issue) => issue.kind === 'js-call:alert' && issue.value === 'Invalid input'));
    assert.ok(issues.some((issue) => issue.kind === 'js-call:toast.success' && issue.value === 'Saved changes'));
    assert.equal(issues.find((issue) => issue.value === 'Save')?.range?.start.offset, vueSource.indexOf('Save'));
    assert.equal(
      issues.find((issue) => issue.value === 'Invalid input')?.range?.start.offset,
      vueSource.indexOf("'Invalid input'"),
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('checkHardcodedStrings respects hardcoded.ignoreFiles', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-ignore-files-'));

  try {
    await mkdir(path.join(tempDir, 'src'), { recursive: true });
    await writeFile(path.join(tempDir, 'src/ignored.ts'), "alert('Invalid input');");
    await writeFile(path.join(tempDir, 'src/empty.ts'), 'const id = 1;');
    const config = await writeConfig(tempDir, "ignoreFiles: ['src/ignored.ts'],");
    const issues = await checkHardcodedStrings(config, tempDir);

    assert.equal(issues.length, 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
