import { summarizeIssues } from './summary.js';
import type { DetectorIssue, ReportOptions } from '../types.js';

export function renderJsonReport(issues: DetectorIssue[], options: ReportOptions): string {
  const visible = options.includeIgnored ? issues : issues.filter((issue) => issue.severity !== 'ignored');
  return `${JSON.stringify({ summary: summarizeIssues(issues), issues: visible }, null, 2)}\n`;
}
