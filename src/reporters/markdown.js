import { summarizeIssues } from './summary.js';

function escapeCell(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

export function renderMarkdownReport(issues, options) {
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

  if (visible.some((issue) => issue.file)) {
    lines.push('| Level | Location | Value | Reason |');
    lines.push('|---|---|---|---|');
  } else if (visible.some((issue) => issue.missing || issue.extra)) {
    lines.push('| Level | Locale | Key | Value | Missing | Extra | Reason |');
    lines.push('|---|---|---|---|---|---|---|');
  } else {
    lines.push('| Level | Locale | Key | Value | Reason |');
    lines.push('|---|---|---|---|---|');
  }

  for (const issue of visible) {
    if (issue.file) {
      lines.push(
        `| ${escapeCell(issue.severity)} | ${escapeCell(formatLocation(issue))} | ${escapeCell(issue.value)} | ${escapeCell(issue.reason)} |`
      );
    } else {
      if (issue.missing || issue.extra) {
        lines.push(
          `| ${escapeCell(issue.severity)} | ${escapeCell(issue.targetLocale)} | ${escapeCell(issue.key)} | ${escapeCell(issue.value)} | ${escapeCell((issue.missing || []).join(', '))} | ${escapeCell((issue.extra || []).join(', '))} | ${escapeCell(issue.reason)} |`
        );
      } else {
        lines.push(
          `| ${escapeCell(issue.severity)} | ${escapeCell(issue.targetLocale)} | ${escapeCell(issue.key)} | ${escapeCell(issue.value)} | ${escapeCell(issue.reason)} |`
        );
      }
    }
  }

  return `${lines.join('\n')}\n`;
}

function formatLocation(issue) {
  if (issue.file) return `${issue.file}:${issue.line}:${issue.column}`;
  return `${issue.targetLocale}.${issue.key}`;
}
