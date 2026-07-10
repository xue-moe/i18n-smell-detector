import { summarizeIssues } from './summary.js';
import type { DetectorIssue, HardcodedIssue, PlaceholderIssue, ReportOptions } from '../types.js';

function escapeCell(value: unknown): string {
  return String(value)
    .replace(/\r?\n/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/[*_`[\]]/g, '\\$&');
}

export function renderMarkdownReport(issues: DetectorIssue[], options: ReportOptions): string {
  const visible = options.includeIgnored ? issues : issues.filter((issue) => issue.severity !== 'ignored');
  const summary = summarizeIssues(issues);
  const lines = [
    `# ${options.heading || 'Identical translations'}`,
    '',
    `high=${summary.high} medium=${summary.medium} low=${summary.low} ignored=${summary.ignored}`,
    '',
  ];

  if (visible.length === 0) {
    lines.push(options.emptyMessage || 'No copied base-locale values found.');
    return `${lines.join('\n')}\n`;
  }

  if (visible.some(isHardcodedIssue)) {
    lines.push('| Level | Location | Value | Reason |');
    lines.push('|---|---|---|---|');
  } else if (visible.some(isPlaceholderIssue)) {
    lines.push('| Level | Locale | Key | Value | Missing | Extra | Reason |');
    lines.push('|---|---|---|---|---|---|---|');
  } else {
    lines.push('| Level | Locale | Key | Value | Reason |');
    lines.push('|---|---|---|---|---|');
  }

  for (const issue of visible) {
    if (isHardcodedIssue(issue)) {
      lines.push(
        `| ${escapeCell(issue.severity)} | ${escapeCell(formatLocation(issue))} | ${escapeCell(issue.value)} | ${escapeCell(issue.reason)} |`,
      );
    } else {
      if (isPlaceholderIssue(issue)) {
        lines.push(
          `| ${escapeCell(issue.severity)} | ${escapeCell(issue.targetLocale)} | ${escapeCell(issue.key)} | ${escapeCell(issue.value)} | ${escapeCell((issue.missing || []).join(', '))} | ${escapeCell((issue.extra || []).join(', '))} | ${escapeCell(issue.reason)} |`,
        );
      } else {
        lines.push(
          `| ${escapeCell(issue.severity)} | ${escapeCell(issue.targetLocale)} | ${escapeCell(issue.key)} | ${escapeCell(issue.value)} | ${escapeCell(issue.reason)} |`,
        );
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function formatLocation(issue: DetectorIssue): string {
  if (isHardcodedIssue(issue)) return `${issue.file}:${issue.line}:${issue.column}`;
  return `${issue.targetLocale}.${issue.key}`;
}

function isHardcodedIssue(issue: DetectorIssue): issue is HardcodedIssue {
  return 'file' in issue;
}

function isPlaceholderIssue(issue: DetectorIssue): issue is PlaceholderIssue {
  return 'missing' in issue;
}
