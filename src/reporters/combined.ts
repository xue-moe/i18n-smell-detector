import { renderConsoleReport } from './console.js';
import { renderHtmlReport } from './html.js';
import { renderMarkdownReport } from './markdown.js';
import { renderSarifReport } from './sarif.js';
import { summarizeIssues } from './summary.js';
import type { CheckResult, IssueWithCheck, ReportOptions, SeveritySummary } from '../types.js';

export function renderCombinedReport(results: CheckResult[], options: ReportOptions): string {
  if (options.format === 'json') return renderCombinedJson(results, options);
  if (options.format === 'markdown') return renderCombinedMarkdown(results, options);
  if (options.format === 'sarif') return renderSarifReport(results, options);
  if (options.format === 'html') return renderHtmlReport(results, options);
  return renderCombinedConsole(results, options);
}

export function flattenResults(
  results: CheckResult[],
  options: Pick<ReportOptions, 'includeIgnored'>,
): IssueWithCheck[] {
  return results.flatMap((result) => {
    const issues = options.includeIgnored
      ? result.issues
      : result.issues.filter((issue) => issue.severity !== 'ignored');
    return issues.map((issue) => ({ check: result.check, ...issue }));
  });
}

export function summarizeResults(results: CheckResult[]): Record<string, SeveritySummary> {
  return Object.fromEntries(results.map((result) => [result.check, summarizeIssues(result.issues)]));
}

function renderCombinedJson(results: CheckResult[], options: ReportOptions): string {
  return `${JSON.stringify(
    {
      summary: summarizeResults(results),
      issues: flattenResults(results, options),
    },
    null,
    2,
  )}\n`;
}

function renderCombinedConsole(results: CheckResult[], options: ReportOptions): string {
  return results
    .map((result) =>
      renderConsoleReport(result.issues, {
        ...options,
        title: result.title,
        emptyMessage: result.emptyMessage,
      }),
    )
    .join('\n\n');
}

function renderCombinedMarkdown(results: CheckResult[], options: ReportOptions): string {
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
    lines.push(
      asSection(
        renderMarkdownReport(result.issues, {
          ...options,
          heading: result.heading,
          emptyMessage: result.emptyMessage,
        }).trim(),
      ),
    );
  }

  return `${lines.join('\n')}\n`;
}

function asSection(markdown: string): string {
  return markdown.replace(/^# /, '## ');
}
