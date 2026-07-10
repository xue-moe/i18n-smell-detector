import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  CheckResult,
  CustomCheckName,
  DetectorIssue,
  HardcodedIssue,
  IdenticalIssue,
  PlaceholderIssue,
} from './types.js';

type BaselineIssue = {
  id: string;
  value: string;
  key?: string;
  targetLocale?: string;
  file?: string;
  line?: number;
  column?: number;
};

function errorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function issueId(check: CustomCheckName, issue: DetectorIssue): string {
  if (!isHardcodedIssue(issue) && (check === 'identical' || check === 'placeholders')) {
    const localeIssue = issue as IdenticalIssue | PlaceholderIssue;
    return `${check}:${localeIssue.targetLocale}:${localeIssue.key}`;
  }
  const hardcodedIssue = issue as HardcodedIssue;
  return `hardcoded:${hardcodedIssue.file}:${hardcodedIssue.line}:${hardcodedIssue.column}:${hardcodedIssue.value}`;
}

export async function loadBaseline(filePath: string | undefined): Promise<Set<string>> {
  if (!filePath) return new Set();

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return new Set();
    throw new Error(`Failed to read baseline file: ${filePath}\nReason: ${errorMessage(error)}`);
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { issues?: unknown }).issues)) {
    throw new Error(`Invalid baseline file: ${filePath}`);
  }

  return new Set(
    (parsed as { issues: Array<{ id?: unknown }> }).issues
      .map((issue) => issue.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );
}

export function applyBaseline(results: CheckResult[], ids: Set<string>): CheckResult[] {
  return results.map((result) => ({
    ...result,
    issues: result.issues.map((issue) => {
      const id = issueId(result.check, issue);
      if (!ids.has(id)) return { ...issue, id };
      return { ...issue, id, severity: 'ignored', reason: 'baseline' };
    }),
  }));
}

export async function writeBaseline(filePath: string, results: CheckResult[]): Promise<number> {
  const issues: BaselineIssue[] = [];

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

function toBaselineIssue(check: CustomCheckName, issue: DetectorIssue): BaselineIssue {
  const base = {
    id: issueId(check, issue),
    value: issue.value,
  };

  if (!isHardcodedIssue(issue) && (check === 'identical' || check === 'placeholders')) {
    const localeIssue = issue as IdenticalIssue | PlaceholderIssue;
    return {
      ...base,
      key: localeIssue.key,
      targetLocale: localeIssue.targetLocale,
    };
  }

  const hardcodedIssue = issue as HardcodedIssue;
  return {
    ...base,
    file: hardcodedIssue.file,
    line: hardcodedIssue.line,
    column: hardcodedIssue.column,
  };
}

function isHardcodedIssue(issue: DetectorIssue): issue is HardcodedIssue {
  return 'file' in issue;
}
