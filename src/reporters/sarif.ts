import type {
  CheckResult,
  DetectorIssue,
  HardcodedIssue,
  IssueWithCheck,
  PlaceholderIssue,
  ReportOptions,
  Severity,
} from '../types.js';

export function renderSarifReport(results: CheckResult[], options: ReportOptions): string {
  const visible = results.flatMap((result) => {
    const issues = options.includeIgnored
      ? result.issues
      : result.issues.filter((issue) => issue.severity !== 'ignored');
    return issues.map((issue) => ({ check: result.check, title: result.heading, ...issue }));
  });
  const rules = new Map<string, Record<string, unknown>>();

  for (const issue of visible) {
    const ruleId = ruleIdFor(issue);
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        name: issue.reason,
        shortDescription: { text: issue.reason },
        fullDescription: { text: `${issue.title || issue.check}: ${issue.reason}` },
        defaultConfiguration: { level: sarifLevel(issue.severity) },
        properties: {
          check: issue.check,
          severity: issue.severity,
        },
      });
    }
  }

  return `${JSON.stringify(
    {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: {
            driver: {
              name: 'i18n-smell-detector',
              informationUri: 'https://github.com/xue-moe/i18n-smell-detector',
              rules: [...rules.values()],
            },
          },
          results: visible.map(toSarifResult),
        },
      ],
    },
    null,
    2,
  )}\n`;
}

function toSarifResult(issue: IssueWithCheck): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ruleId: ruleIdFor(issue),
    level: sarifLevel(issue.severity),
    message: { text: messageFor(issue) },
    properties: {
      id: issue.id,
      check: issue.check,
      severity: issue.severity,
      reason: issue.reason,
      key: isHardcodedIssue(issue) ? undefined : issue.key,
      baseLocale: isHardcodedIssue(issue) ? undefined : issue.baseLocale,
      targetLocale: isHardcodedIssue(issue) ? undefined : issue.targetLocale,
      value: issue.value,
      missing: isPlaceholderIssue(issue) ? issue.missing : undefined,
      extra: isPlaceholderIssue(issue) ? issue.extra : undefined,
      nodeType: isHardcodedIssue(issue) ? issue.nodeType : undefined,
      parentNodeType: isHardcodedIssue(issue) ? issue.parentNodeType : undefined,
      containsInterpolation: isHardcodedIssue(issue) ? issue.containsInterpolation : undefined,
      rawValue: isHardcodedIssue(issue) ? issue.rawValue : undefined,
      interpolations: isHardcodedIssue(issue) ? issue.interpolations : undefined,
      contextHash: isHardcodedIssue(issue) ? issue.contextHash : undefined,
      relativeRange: isHardcodedIssue(issue) ? issue.relativeRange : undefined,
      suppression: 'suppression' in issue ? issue.suppression : undefined,
    },
  };

  if (isHardcodedIssue(issue)) {
    result.locations = [
      {
        physicalLocation: {
          artifactLocation: { uri: issue.file },
          region: {
            startLine: issue.line,
            startColumn: issue.column,
            endLine: issue.range?.end.line,
            endColumn: issue.range?.end.column,
          },
        },
      },
    ];
  }

  result.partialFingerprints = {
    stableId: issue.id,
  };

  return result;
}

function ruleIdFor(issue: IssueWithCheck): string {
  return `i18n-smell/${issue.check}/${slug(issue.reason)}`;
}

function sarifLevel(severity: Severity): string {
  if (severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  if (severity === 'low') return 'note';
  return 'none';
}

function messageFor(issue: IssueWithCheck): string {
  if (isHardcodedIssue(issue)) return `${issue.reason}: ${issue.value}`;
  const details = [];
  if (isPlaceholderIssue(issue) && issue.missing.length) details.push(`missing ${issue.missing.join(', ')}`);
  if (isPlaceholderIssue(issue) && issue.extra.length) details.push(`extra ${issue.extra.join(', ')}`);
  const suffix = details.length ? ` (${details.join('; ')})` : '';
  return `${issue.targetLocale}.${issue.key}: ${issue.reason}${suffix}`;
}

function slug(value: string): string {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'issue'
  );
}

function isHardcodedIssue(issue: DetectorIssue): issue is HardcodedIssue {
  return 'file' in issue;
}

function isPlaceholderIssue(issue: DetectorIssue): issue is PlaceholderIssue {
  return 'missing' in issue;
}
