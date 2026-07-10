import path from 'node:path';
import fg from 'fast-glob';
import { appError } from './errors.js';
import { scanJsSource } from './source/scan-js-source.js';
import { scanVueSfc } from './source/scan-vue-sfc.js';
import type { DetectorConfig, HardcodedConfig, HardcodedIssue } from './types.js';

type HardcodedScanConfig = Pick<DetectorConfig, 'source'> & { hardcoded: Partial<HardcodedConfig> };

function compareIssues(a: HardcodedIssue, b: HardcodedIssue): number {
  const rank = { high: 3, medium: 2, low: 1, ignored: 0 };
  return rank[b.severity] - rank[a.severity] || a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column;
}

export async function checkHardcodedStrings(config: HardcodedScanConfig, baseDir: string): Promise<HardcodedIssue[]> {
  const files = await fg(config.source, {
    cwd: baseDir,
    absolute: true,
    onlyFiles: true,
    ignore: ['**/node_modules/**', ...(config.hardcoded.ignoreFiles || [])],
  });

  if (files.length === 0) {
    throw appError(`No source files matched: ${config.source.join(', ')}`, 'SOURCE_NOT_FOUND');
  }

  const issues: HardcodedIssue[] = [];
  for (const file of files) {
    const fileIssues = await scanSourceFile(file, config);
    for (const issue of fileIssues) {
      issues.push({
        ...issue,
        file: path.relative(baseDir, issue.file),
      });
    }
  }

  return issues.sort(compareIssues);
}

async function scanSourceFile(file: string, config: HardcodedScanConfig): Promise<HardcodedIssue[]> {
  if (file.endsWith('.vue')) return scanVueSfc(file, config);
  if (/\.[cm]?[jt]sx?$/.test(file)) return scanJsSource(file, config);
  return [];
}
