import { summarizeIssues } from './summary.js';

export function renderJsonReport(issues, options) {
  const visible = options.includeIgnored ? issues : issues.filter((issue) => issue.severity !== 'ignored');
  return `${JSON.stringify({ summary: summarizeIssues(issues), issues: visible }, null, 2)}\n`;
}
