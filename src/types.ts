export type Severity = 'ignored' | 'low' | 'medium' | 'high';
export type ReportFormat = 'console' | 'json' | 'markdown' | 'sarif' | 'html';
export type FailOnLevel = 'none' | 'low' | 'medium' | 'high';
export type ConfigPreset = 'recommended' | 'strict';

export type Rule = string | RegExp;

export interface SourcePosition {
  line: number;
  column: number;
  offset?: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export interface MessageInterpolation {
  placeholder: string;
  expression: string;
  range: SourceRange;
}

export interface HardcodedConfig {
  vueAttributes: string[];
  jsxAttributes: string[];
  functions: string[];
  ignoreFiles: string[];
  ignoreValues: Rule[];
  ignorePatterns: RegExp[];
  sinks: HardcodedSinks;
}

export interface HardcodedCallSink {
  callee: string;
  arguments: number[];
}

export interface HardcodedSinks {
  calls: HardcodedCallSink[];
  assignments: string[];
  properties: string[];
}

export type HardcodedConfigInput = Partial<Omit<HardcodedConfig, 'sinks'>> & {
  sinks?: Partial<HardcodedSinks>;
};

export interface DetectorChecks {
  identical: boolean;
  hardcoded: boolean;
  placeholders: boolean;
}

export interface DetectorConfig {
  baseLocale: string;
  locales: Record<string, string>;
  allowIdenticalKeys: Rule[];
  allowIdenticalValues: Rule[];
  placeholderPatterns: RegExp[];
  source: string[];
  hardcoded: HardcodedConfig;
  checks: DetectorChecks;
  format?: ReportFormat;
  output?: string;
  baseline?: string;
  ignoreCodeLike: boolean;
  ignoreSameLanguageFamily: boolean;
  trimWhitespace: boolean;
  ignoreCase: boolean;
  includeIgnored: boolean;
  failOn: FailOnLevel;
}

export type DetectorConfigInput = Partial<Omit<DetectorConfig, 'checks' | 'hardcoded' | 'placeholderPatterns'>> & {
  preset?: ConfigPreset;
  checks?: Partial<DetectorChecks>;
  hardcoded?: HardcodedConfigInput;
  placeholderPatterns?: Rule[];
};

export interface IdenticalIssue {
  id?: string;
  key: string;
  baseLocale: string;
  targetLocale: string;
  value: string;
  severity: Severity;
  reason: string;
}

export interface HardcodedIssue {
  id?: string;
  file: string;
  line: number;
  column: number;
  value: string;
  severity: Severity;
  reason: string;
  kind: string;
  range?: SourceRange;
  nodeType?: string;
  parentNodeType?: string;
  containsInterpolation?: boolean;
  rawValue?: string;
  interpolations?: MessageInterpolation[];
  contextHash?: string;
  relativeRange?: { start: number; end: number };
}

export interface PlaceholderIssue {
  id?: string;
  key: string;
  baseLocale: string;
  targetLocale: string;
  value: string;
  missing: string[];
  extra: string[];
  severity: Severity;
  reason: string;
}

export type DetectorIssue = IdenticalIssue | HardcodedIssue | PlaceholderIssue;
export type CheckName = keyof DetectorChecks;
export type CustomCheckName = CheckName | 'custom';

export type IssueWithCheck = DetectorIssue & {
  check: CustomCheckName;
  title?: string;
};

export interface CheckResult<TIssue extends DetectorIssue = DetectorIssue> {
  check: CustomCheckName;
  title?: string;
  heading: string;
  emptyMessage: string;
  issues: TIssue[];
}

export interface ReportOptions {
  format?: ReportFormat;
  includeIgnored?: boolean;
  title?: string;
  heading?: string;
  emptyMessage?: string;
  check?: CustomCheckName;
}

export type SeveritySummary = Record<Severity, number>;
