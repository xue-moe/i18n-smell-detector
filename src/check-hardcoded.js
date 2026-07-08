import path from 'node:path';
import fg from 'fast-glob';
import { scanVueSfc } from './source/scan-vue-sfc.js';

function compareIssues(a, b) {
  const rank = { high: 3, medium: 2, low: 1, ignored: 0 };
  return rank[b.severity] - rank[a.severity]
    || a.file.localeCompare(b.file)
    || a.line - b.line
    || a.column - b.column;
}

export async function checkHardcodedStrings(config, baseDir) {
  const files = await fg(config.source, {
    cwd: baseDir,
    absolute: true,
    onlyFiles: true,
    ignore: ['**/node_modules/**'],
  });

  if (files.length === 0) {
    throw new Error(`No source files matched: ${config.source.join(', ')}`);
  }

  const issues = [];
  for (const file of files) {
    const fileIssues = await scanVueSfc(file, config);
    for (const issue of fileIssues) {
      issues.push({
        ...issue,
        file: path.relative(baseDir, issue.file),
      });
    }
  }

  return issues.sort(compareIssues);
}
