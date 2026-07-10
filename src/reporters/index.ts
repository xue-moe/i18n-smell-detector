import { renderConsoleReport } from './console.js';
import { renderJsonReport } from './json.js';
import { renderMarkdownReport } from './markdown.js';
import { renderSarifReport } from './sarif.js';
import { renderHtmlReport } from './html.js';
import type { DetectorIssue, ReportOptions } from '../types.js';

export function renderReport(issues: DetectorIssue[], options: ReportOptions): string {
  if (options.format === 'json') return renderJsonReport(issues, options);
  if (options.format === 'markdown') return renderMarkdownReport(issues, options);
  if (options.format === 'html')
    return renderHtmlReport(
      [
        {
          check: options.check || 'custom',
          heading: options.heading || options.title || 'Custom report',
          title: options.title || options.heading || 'custom report',
          emptyMessage: options.emptyMessage || 'No issues found.',
          issues,
        },
      ],
      options,
    );
  if (options.format === 'sarif') {
    return renderSarifReport(
      [
        {
          check: options.check || 'custom',
          heading: options.heading || options.title || 'Custom report',
          title: options.title || options.heading || 'custom report',
          emptyMessage: options.emptyMessage || 'No issues found.',
          issues,
        },
      ],
      options,
    );
  }
  return renderConsoleReport(issues, options);
}
