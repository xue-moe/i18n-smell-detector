import { NodeTypes, parse } from '@vue/compiler-dom';
import { classifyHardcoded } from '../rules/classify-hardcoded.js';
import type { HardcodedConfig, HardcodedIssue, Severity } from '../types.js';

type HardcodedScanConfig = { hardcoded: Partial<HardcodedConfig> };

type VueLocation = {
  start: {
    offset: number;
  };
};

type VueNode = {
  type: number;
  children?: VueNode[];
  props?: VueNode[];
  loc: VueLocation;
  content?: string;
  name?: string;
  value?: {
    content: string;
    loc: VueLocation;
  };
};

function offsetToLocation(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isI18nExpression(value: string): boolean {
  return /\b(?:t|te|\$t|i18n\.t)\s*\(/.test(value);
}

function makeIssue({
  file,
  lineOffset,
  template,
  loc,
  value,
  kind,
  reason,
  severity,
}: {
  file: string;
  lineOffset: number;
  template: string;
  loc: VueLocation;
  value: string;
  kind: string;
  reason: string;
  severity: Severity;
}): HardcodedIssue {
  const start = offsetToLocation(template, loc.start.offset);
  return {
    file,
    line: lineOffset + start.line,
    column: start.column,
    value,
    severity,
    reason,
    kind,
  };
}

function scanValue({
  file,
  lineOffset,
  template,
  loc,
  value,
  kind,
  baseReason,
  config,
}: {
  file: string;
  lineOffset: number;
  template: string;
  loc: VueLocation;
  value: string;
  kind: string;
  baseReason: string;
  config: HardcodedScanConfig;
}): HardcodedIssue | null {
  const text = normalizeText(value);
  if (!text) return null;

  const classification = classifyHardcoded(text, config);
  return makeIssue({
    file,
    lineOffset,
    template,
    loc,
    value: text,
    severity: classification.severity,
    reason: classification.severity === 'ignored' ? classification.reason : baseReason,
    kind,
  });
}

function walk(node: VueNode, visitor: (node: VueNode) => void): void {
  visitor(node);
  for (const child of node.children || []) walk(child, visitor);
}

export function scanVueTemplate(
  template: string,
  { file, lineOffset = 0, config }: { file: string; lineOffset?: number; config: HardcodedScanConfig },
): HardcodedIssue[] {
  let ast: VueNode;
  try {
    ast = parse(template, { comments: false }) as VueNode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Malformed Vue template in ${file}: ${message}`);
  }

  const attributes = new Set(config.hardcoded.vueAttributes);
  const issues: HardcodedIssue[] = [];

  walk(ast, (node) => {
    if (node.type === NodeTypes.TEXT) {
      const issue = scanValue({
        file,
        lineOffset,
        template,
        loc: node.loc,
        value: node.content || '',
        kind: 'vue-text',
        baseReason: 'static template text',
        config,
      });
      if (issue) issues.push(issue);
      return;
    }

    if (node.type !== NodeTypes.ELEMENT) return;

    for (const prop of node.props || []) {
      if (prop.type !== NodeTypes.ATTRIBUTE) continue;
      if (!prop.name || !attributes.has(prop.name) || !prop.value) continue;
      if (isI18nExpression(prop.value.content)) continue;

      const issue = scanValue({
        file,
        lineOffset,
        template,
        loc: prop.value.loc,
        value: prop.value.content,
        kind: `vue-attribute:${prop.name}`,
        baseReason: `static ${prop.name} attribute`,
        config,
      });
      if (issue) issues.push(issue);
    }
  });

  return issues;
}
