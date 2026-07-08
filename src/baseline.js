import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function issueId(check, issue) {
  if (check === 'identical') return `identical:${issue.targetLocale}:${issue.key}`;
  return `hardcoded:${issue.file}:${issue.line}:${issue.column}:${issue.value}`;
}

export async function loadBaseline(filePath) {
  if (!filePath) return new Set();

  let parsed;
  try {
    parsed = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return new Set();
    throw new Error(`Failed to read baseline file: ${filePath}\nReason: ${error.message}`);
  }

  if (!parsed || !Array.isArray(parsed.issues)) {
    throw new Error(`Invalid baseline file: ${filePath}`);
  }

  return new Set(parsed.issues.map((issue) => issue.id).filter(Boolean));
}

export function applyBaseline(results, ids) {
  if (!ids.size) return results;

  return results.map((result) => ({
    ...result,
    issues: result.issues.map((issue) => {
      const id = issueId(result.check, issue);
      if (!ids.has(id)) return { ...issue, id };
      return { ...issue, id, severity: 'ignored', reason: 'baseline' };
    }),
  }));
}

export async function writeBaseline(filePath, results) {
  const issues = [];

  for (const result of results) {
    for (const issue of result.issues) {
      if (issue.severity === 'ignored') continue;
      issues.push(toBaselineIssue(result.check, issue));
    }
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({ version: 1, issues }, null, 2)}\n`);
  return issues.length;
}

function toBaselineIssue(check, issue) {
  const base = {
    id: issueId(check, issue),
    value: issue.value,
  };

  if (check === 'identical') {
    return {
      ...base,
      key: issue.key,
      targetLocale: issue.targetLocale,
    };
  }

  return {
    ...base,
    file: issue.file,
    line: issue.line,
    column: issue.column,
  };
}
