import { renderConsoleReport } from './console.js';
import { renderJsonReport } from './json.js';
import { renderMarkdownReport } from './markdown.js';

export function renderReport(issues, options) {
  if (options.format === 'json') return renderJsonReport(issues, options);
  if (options.format === 'markdown') return renderMarkdownReport(issues, options);
  return renderConsoleReport(issues, options);
}
