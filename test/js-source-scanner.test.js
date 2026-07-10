import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkHardcodedStrings } from '../src/check-hardcoded.js';
import { loadConfig } from '../src/config.js';

async function writeConfig(root, extra = '') {
  const configPath = path.join(root, 'i18n-smell.config.mjs');
  await writeFile(configPath, `
    export default {
      source: ['src/**/*.{js,ts,tsx}'],
      hardcoded: {
        functions: ['toast.success', 'alert', 'confirm'],
        jsxAttributes: ['placeholder', 'title'],
        ${extra}
      }
    };
  `);
  return loadConfig(configPath);
}

test('checkHardcodedStrings detects configured JS and TS function call strings', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-js-'));

  try {
    await mkdir(path.join(tempDir, 'src'), { recursive: true });
    await writeFile(path.join(tempDir, 'src/actions.ts'), `
      toast.success('Saved changes');
      alert('Invalid input');
      console.log('debug only');
    `);
    const config = await writeConfig(tempDir);
    const issues = await checkHardcodedStrings(config, tempDir);

    assert.ok(issues.some((issue) => issue.kind === 'js-call:toast.success' && issue.value === 'Saved changes'));
    assert.ok(issues.some((issue) => issue.kind === 'js-call:alert' && issue.value === 'Invalid input'));
    assert.equal(issues.some((issue) => issue.value === 'debug only'), false);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('checkHardcodedStrings detects JSX text and static attributes', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'i18n-smell-jsx-'));

  try {
    await mkdir(path.join(tempDir, 'src'), { recursive: true });
    await writeFile(path.join(tempDir, 'src/SearchBox.tsx'), `
      export function SearchBox() {
        return <section title="User tools"><button>Save changes</button><input placeholder="Search users" /></section>;
      }
    `);
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
    await writeFile(path.join(tempDir, 'src/UserPanel.vue'), `
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
    `);
    const configPath = path.join(tempDir, 'i18n-smell.config.mjs');
    await writeFile(configPath, `
      export default {
        source: ['src/**/*.vue'],
        hardcoded: {
          functions: ['toast.success', 'alert']
        }
      };
    `);
    const config = await loadConfig(configPath);
    const issues = await checkHardcodedStrings(config, tempDir);

    assert.ok(issues.some((issue) => issue.kind === 'vue-text' && issue.value === 'Save'));
    assert.ok(issues.some((issue) => issue.kind === 'js-call:alert' && issue.value === 'Invalid input'));
    assert.ok(issues.some((issue) => issue.kind === 'js-call:toast.success' && issue.value === 'Saved changes'));
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
