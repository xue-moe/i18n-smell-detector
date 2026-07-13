import { summarizeIssues } from './summary.js';
import type { CheckResult, DetectorIssue, HardcodedIssue, PlaceholderIssue, ReportOptions } from '../types.js';

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function visibleIssues(result: CheckResult, includeIgnored: boolean): DetectorIssue[] {
  return includeIgnored ? result.issues : result.issues.filter((issue) => issue.severity !== 'ignored');
}

function formatLocation(issue: DetectorIssue): string {
  if (isHardcodedIssue(issue)) return `${issue.file}:${issue.line}:${issue.column}`;
  return `${issue.targetLocale}.${issue.key}`;
}

function formatDetails(issue: DetectorIssue): string {
  const details: string[] = [];
  if (isPlaceholderIssue(issue) && issue.missing.length) details.push(`missing: ${issue.missing.join(', ')}`);
  if (isPlaceholderIssue(issue) && issue.extra.length) details.push(`extra: ${issue.extra.join(', ')}`);
  if ('suppression' in issue && issue.suppression) {
    details.push(`do-not-translate: ${issue.suppression.category} (${issue.suppression.reason})`);
  }
  return details.join('; ');
}

export function renderHtmlReport(results: CheckResult[], options: ReportOptions): string {
  const includeIgnored = options.includeIgnored || false;
  const summaryRows = results
    .map((result) => {
      const summary = summarizeIssues(result.issues);
      return `<tr><th scope="row">${escapeHtml(result.check)}</th><td>${summary.high}</td><td>${summary.medium}</td><td>${summary.low}</td><td>${summary.ignored}</td></tr>`;
    })
    .join('\n');

  const sections = results
    .map((result) => {
      const visible = visibleIssues(result, includeIgnored);
      const rows = visible
        .map((issue) => {
          const details = formatDetails(issue);
          return `<tr class="severity-${escapeHtml(issue.severity)}"><td>${escapeHtml(issue.severity)}</td><td>${escapeHtml(formatLocation(issue))}</td><td><code>${escapeHtml(issue.value)}</code></td><td>${escapeHtml(details)}</td><td>${escapeHtml(issue.reason)}</td></tr>`;
        })
        .join('\n');

      const body =
        visible.length > 0
          ? `<table><thead><tr><th>Level</th><th>Location</th><th>Value</th><th>Details</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>`
          : `<p class="empty">${escapeHtml(result.emptyMessage || 'No issues found.')}</p>`;

      return `<section><h2>${escapeHtml(result.heading || result.title || result.check)}</h2>${body}</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>i18n-smell-detector report</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; color: #17202a; background: #f8fafc; }
    main { max-width: 1100px; margin: 0 auto; }
    h1, h2 { margin: 0 0 1rem; }
    section { margin-top: 2rem; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d8dee4; }
    th, td { padding: .65rem .75rem; border-bottom: 1px solid #d8dee4; text-align: left; vertical-align: top; }
    th { background: #eef2f7; }
    code { white-space: pre-wrap; word-break: break-word; }
    .severity-high td:first-child { color: #b42318; font-weight: 700; }
    .severity-medium td:first-child { color: #a15c07; font-weight: 700; }
    .severity-low td:first-child { color: #0969da; font-weight: 700; }
    .severity-ignored td:first-child { color: #6e7781; font-weight: 700; }
    .empty { padding: 1rem; background: white; border: 1px solid #d8dee4; }
  </style>
</head>
<body>
  <main>
    <h1>i18n-smell-detector report</h1>
    <section>
      <h2>Summary</h2>
      <table><thead><tr><th>Check</th><th>High</th><th>Medium</th><th>Low</th><th>Ignored</th></tr></thead><tbody>${summaryRows}</tbody></table>
    </section>
    ${sections}
  </main>
</body>
</html>
`;
}

function isHardcodedIssue(issue: DetectorIssue): issue is HardcodedIssue {
  return 'file' in issue;
}

function isPlaceholderIssue(issue: DetectorIssue): issue is PlaceholderIssue {
  return 'missing' in issue;
}
