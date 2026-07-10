import { renderConsoleReport } from './console.js';
import { renderJsonReport } from './json.js';
import { renderMarkdownReport } from './markdown.js';
import { renderSarifReport } from './sarif.js';
import { renderHtmlReport } from './html.js';

export function renderReport(issues, options) {
  if (options.format === 'json') return renderJsonReport(issues, options);
  if (options.format === 'markdown') return renderMarkdownReport(issues, options);
  if (options.format === 'html')
    return renderHtmlReport(
      [
        {
          check: options.check || 'custom',
          heading: options.heading,
          title: options.title,
          emptyMessage: options.emptyMessage,
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
          heading: options.heading,
          issues,
        },
      ],
      options,
    );
  }
  return renderConsoleReport(issues, options);
}
