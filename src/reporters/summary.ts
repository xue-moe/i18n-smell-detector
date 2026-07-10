import type { DetectorIssue, SeveritySummary } from '../types.js';

export function summarizeIssues(issues: DetectorIssue[]): SeveritySummary {
  return issues.reduce(
    (summary, issue) => {
      summary[issue.severity] += 1;
      return summary;
    },
    { high: 0, medium: 0, low: 0, ignored: 0 },
  );
}
