export function renderJsonReport(issues, options) {
  const visible = options.includeIgnored ? issues : issues.filter((issue) => issue.severity !== 'ignored');
  return `${JSON.stringify({ issues: visible }, null, 2)}\n`;
}
