import { summarizeIssues } from './summary.js';

function color(code, text) {
  if (process.env.NO_COLOR) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}

function label(level) {
  if (level === 'high') return color('31;1', 'HIGH');
  if (level === 'medium') return color('33;1', 'MEDIUM');
  if (level === 'low') return color('36;1', 'LOW');
  return color('90', 'IGNORED');
}

function preview(value) {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length <= 90 ? text : `${text.slice(0, 87)}...`;
}

export function renderConsoleReport(issues, options) {
  const visible = options.includeIgnored ? issues : issues.filter((issue) => issue.severity !== 'ignored');
  const counts = summarizeIssues(issues);
  const lines = [
    color('1', `i18n-smell-detector: ${options.title || 'identical translations'}`),
    `high=${counts.high} medium=${counts.medium} low=${counts.low} ignored=${counts.ignored}`,
  ];

  if (visible.length === 0) {
    lines.push(color('32', options.emptyMessage || 'No copied base-locale values found.'));
    return lines.join('\n');
  }

  lines.push('');
  for (const issue of visible) {
    lines.push(`${label(issue.severity)} ${formatLocation(issue)}`);
    lines.push(`  value: "${preview(issue.value)}"`);
    for (const detail of formatDetails(issue)) {
      lines.push(`  ${detail}`);
    }
    lines.push(`  reason: ${issue.reason}`);
  }

  return lines.join('\n');
}

function formatLocation(issue) {
  if (issue.file) return `${issue.file}:${issue.line}:${issue.column}`;
  return `${issue.targetLocale}.${issue.key}`;
}

function formatDetails(issue) {
  const details = [];
  if (issue.missing?.length) details.push(`missing: ${issue.missing.join(', ')}`);
  if (issue.extra?.length) details.push(`extra: ${issue.extra.join(', ')}`);
  return details;
}
