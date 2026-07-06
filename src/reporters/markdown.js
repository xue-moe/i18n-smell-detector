function escapeCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

export function renderMarkdownReport(issues, options) {
  const visible = options.includeIgnored ? issues : issues.filter((issue) => issue.severity !== 'ignored');
  const lines = ['# Identical translations', ''];

  if (visible.length === 0) {
    lines.push('No copied base-locale values found.');
    return `${lines.join('\n')}\n`;
  }

  lines.push('| Level | Locale | Key | Value | Reason |');
  lines.push('|---|---|---|---|---|');
  for (const issue of visible) {
    lines.push(
      `| ${escapeCell(issue.severity)} | ${escapeCell(issue.targetLocale)} | ${escapeCell(issue.key)} | ${escapeCell(issue.value)} | ${escapeCell(issue.reason)} |`
    );
  }

  return `${lines.join('\n')}\n`;
}
