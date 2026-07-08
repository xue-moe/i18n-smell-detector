import { renderConsoleReport } from './console.js';
import { renderMarkdownReport } from './markdown.js';
import { summarizeIssues } from './summary.js';

export function renderCombinedReport(results, options) {
  if (options.format === 'json') return renderCombinedJson(results, options);
  if (options.format === 'markdown') return renderCombinedMarkdown(results, options);
  return renderCombinedConsole(results, options);
}

export function flattenResults(results, options) {
  return results.flatMap((result) => {
    const issues = options.includeIgnored ? result.issues : result.issues.filter((issue) => issue.severity !== 'ignored');
    return issues.map((issue) => ({ check: result.check, ...issue }));
  });
}

export function summarizeResults(results) {
  return Object.fromEntries(results.map((result) => [result.check, summarizeIssues(result.issues)]));
}

function renderCombinedJson(results, options) {
  return `${JSON.stringify({
    summary: summarizeResults(results),
    issues: flattenResults(results, options),
  }, null, 2)}\n`;
}

function renderCombinedConsole(results, options) {
  return results.map((result) => renderConsoleReport(result.issues, {
    ...options,
    title: result.title,
    emptyMessage: result.emptyMessage,
  })).join('\n\n');
}

function renderCombinedMarkdown(results, options) {
  const lines = [
    '# i18n-smell-detector report',
    '',
    '## Summary',
    '',
    '| Check | High | Medium | Low | Ignored |',
    '|---|---:|---:|---:|---:|',
  ];

  for (const result of results) {
    const summary = summarizeIssues(result.issues);
    lines.push(`| ${result.check} | ${summary.high} | ${summary.medium} | ${summary.low} | ${summary.ignored} |`);
  }

  for (const result of results) {
    lines.push('');
    lines.push(asSection(renderMarkdownReport(result.issues, {
      ...options,
      heading: result.heading,
      emptyMessage: result.emptyMessage,
    }).trim()));
  }

  return `${lines.join('\n')}\n`;
}

function asSection(markdown) {
  return markdown.replace(/^# /, '## ');
}
