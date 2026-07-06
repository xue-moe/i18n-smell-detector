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
  const counts = countBySeverity(issues);
  const lines = [
    color('1', 'i18n-smell-detector: identical translations'),
    `high=${counts.high} medium=${counts.medium} low=${counts.low} ignored=${counts.ignored}`,
  ];

  if (visible.length === 0) {
    lines.push(color('32', 'No copied base-locale values found.'));
    return lines.join('\n');
  }

  lines.push('');
  for (const issue of visible) {
    lines.push(`${label(issue.severity)} ${issue.targetLocale}.${issue.key}`);
    lines.push(`  value: "${preview(issue.value)}"`);
    lines.push(`  reason: ${issue.reason}`);
  }

  return lines.join('\n');
}

function countBySeverity(issues) {
  return issues.reduce(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0, ignored: 0 }
  );
}
