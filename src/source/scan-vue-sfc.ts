import { readFile } from 'node:fs/promises';
import { parse } from '@vue/compiler-sfc';
import { scanJsText } from './scan-js-source.js';
import { scanVueTemplate } from './scan-vue-template.js';
import type { HardcodedConfig, HardcodedIssue } from '../types.js';

type HardcodedScanConfig = { hardcoded: Partial<HardcodedConfig> };

export async function scanVueSfc(file: string, config: HardcodedScanConfig): Promise<HardcodedIssue[]> {
  const source = await readFile(file, 'utf8');
  const result = parse(source, { filename: file });

  if (result.errors.length > 0) {
    const [error] = result.errors;
    throw new Error(`Malformed Vue file ${file}: ${error.message || String(error)}`);
  }

  const issues: HardcodedIssue[] = [];
  const { template, script, scriptSetup } = result.descriptor;

  if (template) {
    issues.push(
      ...scanVueTemplate(template.content, {
        file,
        fileSource: source,
        sourceOffset: template.loc.start.offset,
        config,
      }),
    );
  }

  for (const block of [script, scriptSetup]) {
    if (!block) continue;
    issues.push(
      ...scanJsText(block.content, {
        file,
        fileSource: source,
        sourceOffset: block.loc.start.offset,
        config,
      }),
    );
  }

  return issues;
}
