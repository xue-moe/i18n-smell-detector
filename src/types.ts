export type Severity = 'ignored' | 'low' | 'medium' | 'high';
export type ReportFormat = 'console' | 'json' | 'markdown' | 'sarif' | 'html';
export type FailOnLevel = 'none' | 'low' | 'medium' | 'high';
export type ConfigPreset = 'recommended' | 'strict';

export type Rule = string | RegExp;

export interface HardcodedConfig {
  vueAttributes: string[];
  jsxAttributes: string[];
  functions: string[];
  ignoreFiles: string[];
  ignoreValues: Rule[];
  ignorePatterns: RegExp[];
}

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
  hardcoded?: Partial<HardcodedConfig>;
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

export interface CheckResult<TIssue extends DetectorIssue = DetectorIssue> {
  check: CheckName;
  title: string;
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
  check?: CheckName | 'custom';
}
