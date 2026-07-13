import { NodeTypes, parse } from '@vue/compiler-dom';
import { classifyHardcoded } from '../rules/classify-hardcoded.js';
import type { HardcodedConfig, HardcodedIssue, Severity, SourceRange } from '../types.js';
import { scanExpressionStrings } from './scan-expression-strings.js';
import { rangeFromOffsets } from './source-range.js';

type HardcodedScanConfig = { hardcoded: Partial<HardcodedConfig> };

type VueLocation = {
  start: {
    offset: number;
  };
  end: {
    offset: number;
  };
};

type VueNode = {
  type: number;
  children?: VueNode[];
  props?: VueNode[];
  loc: VueLocation;
  content?: string | VueNode;
  name?: string;
  isStatic?: boolean;
  arg?: VueNode;
  exp?: VueNode;
  value?: {
    content: string;
    loc: VueLocation;
  };
};

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
  fileSource,
  sourceOffset,
  loc,
  value,
  kind,
  reason,
  severity,
  nodeType,
  parentNodeType,
  containsInterpolation,
}: {
  file: string;
  lineOffset: number;
  template: string;
  fileSource?: string;
  sourceOffset: number;
  loc: VueLocation;
  value: string;
  kind: string;
  reason: string;
  severity: Severity;
  nodeType: string;
  parentNodeType?: string;
  containsInterpolation: boolean;
}): HardcodedIssue {
  const range = resolveRange(template, loc, { fileSource, sourceOffset, lineOffset });
  return {
    file,
    line: range.start.line,
    column: range.start.column,
    value,
    severity,
    reason,
    kind,
    range,
    nodeType,
    parentNodeType,
    containsInterpolation,
  };
}

function scanValue({
  file,
  lineOffset,
  template,
  fileSource,
  sourceOffset,
  loc,
  value,
  kind,
  baseReason,
  config,
  nodeType,
  parentNodeType,
  containsInterpolation = false,
}: {
  file: string;
  lineOffset: number;
  template: string;
  fileSource?: string;
  sourceOffset: number;
  loc: VueLocation;
  value: string;
  kind: string;
  baseReason: string;
  config: HardcodedScanConfig;
  nodeType: string;
  parentNodeType?: string;
  containsInterpolation?: boolean;
}): HardcodedIssue | null {
  const text = normalizeText(value);
  if (!text) return null;

  const classification = classifyHardcoded(text, config);
  return makeIssue({
    file,
    lineOffset,
    template,
    fileSource,
    sourceOffset,
    loc,
    value: text,
    severity: classification.severity,
    reason: classification.severity === 'ignored' ? classification.reason : baseReason,
    kind,
    nodeType,
    parentNodeType,
    containsInterpolation,
  });
}

function walk(node: VueNode, visitor: (node: VueNode, parent?: VueNode) => void, parent?: VueNode): void {
  visitor(node, parent);
  for (const child of node.children || []) walk(child, visitor, node);
}

export function scanVueTemplate(
  template: string,
  {
    file,
    lineOffset = 0,
    sourceOffset = 0,
    fileSource,
    config,
  }: {
    file: string;
    lineOffset?: number;
    sourceOffset?: number;
    fileSource?: string;
    config: HardcodedScanConfig;
  },
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

  walk(ast, (node, parent) => {
    if (node.type === NodeTypes.TEXT) {
      const issue = scanValue({
        file,
        lineOffset,
        template,
        fileSource,
        sourceOffset,
        loc: node.loc,
        value: typeof node.content === 'string' ? node.content : '',
        kind: 'vue-text',
        baseReason: 'static template text',
        config,
        nodeType: vueNodeType(node.type),
        parentNodeType: parent ? vueNodeType(parent.type) : undefined,
      });
      if (issue) issues.push(issue);
      return;
    }

    if (node.type === NodeTypes.INTERPOLATION && node.content && typeof node.content !== 'string') {
      scanVueExpression({
        expression: node.content,
        file,
        template,
        fileSource,
        sourceOffset,
        lineOffset,
        kind: 'vue-interpolation',
        baseReason: 'static string in Vue interpolation',
        config,
        issues,
      });
      return;
    }

    if (node.type !== NodeTypes.ELEMENT) return;

    for (const prop of node.props || []) {
      if (prop.type === NodeTypes.DIRECTIVE && prop.name === 'bind' && prop.exp) {
        const attribute = prop.arg?.isStatic && typeof prop.arg.content === 'string' ? prop.arg.content : 'dynamic';
        scanVueExpression({
          expression: prop.exp,
          file,
          template,
          fileSource,
          sourceOffset,
          lineOffset,
          kind: `vue-bind:${attribute}`,
          baseReason: `static string in bound ${attribute} attribute`,
          config,
          issues,
        });
        continue;
      }

      if (prop.type !== NodeTypes.ATTRIBUTE) continue;
      if (!prop.name || !attributes.has(prop.name) || !prop.value) continue;
      if (isI18nExpression(prop.value.content)) continue;

      const issue = scanValue({
        file,
        lineOffset,
        template,
        fileSource,
        sourceOffset,
        loc: prop.value.loc,
        value: prop.value.content,
        kind: `vue-attribute:${prop.name}`,
        baseReason: `static ${prop.name} attribute`,
        config,
        nodeType: vueNodeType(prop.type),
        parentNodeType: vueNodeType(node.type),
      });
      if (issue) issues.push(issue);
    }
  });

  return issues;
}

function scanVueExpression({
  expression,
  file,
  template,
  fileSource,
  sourceOffset,
  lineOffset,
  kind,
  baseReason,
  config,
  issues,
}: {
  expression: VueNode;
  file: string;
  template: string;
  fileSource?: string;
  sourceOffset: number;
  lineOffset: number;
  kind: string;
  baseReason: string;
  config: HardcodedScanConfig;
  issues: HardcodedIssue[];
}): void {
  if (typeof expression.content !== 'string' || isI18nExpression(expression.content)) return;

  let strings;
  try {
    strings = scanExpressionStrings(expression.content, {
      fileSource: fileSource ?? template,
      sourceOffset: sourceOffset + expression.loc.start.offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Malformed Vue expression in ${file}: ${message}`);
  }

  for (const finding of strings) {
    const text = normalizeText(finding.value);
    if (!text) continue;
    const classification = classifyHardcoded(text, config);
    const range =
      !fileSource && lineOffset
        ? {
            start: { ...finding.range.start, line: finding.range.start.line + lineOffset },
            end: { ...finding.range.end, line: finding.range.end.line + lineOffset },
          }
        : finding.range;
    issues.push({
      file,
      line: range.start.line,
      column: range.start.column,
      value: text,
      severity: classification.severity,
      reason: classification.severity === 'ignored' ? classification.reason : baseReason,
      kind,
      range,
      nodeType: finding.nodeType,
      parentNodeType: finding.expressionKind,
      containsInterpolation: finding.containsInterpolation,
      rawValue: finding.rawValue,
      interpolations: finding.interpolations,
    });
  }
}

function resolveRange(
  template: string,
  loc: VueLocation,
  { fileSource, sourceOffset, lineOffset }: { fileSource?: string; sourceOffset: number; lineOffset: number },
): SourceRange {
  if (fileSource) {
    return rangeFromOffsets(fileSource, sourceOffset + loc.start.offset, sourceOffset + loc.end.offset);
  }

  const range = rangeFromOffsets(template, loc.start.offset, loc.end.offset);
  if (!lineOffset && !sourceOffset) return range;

  return {
    start: {
      ...range.start,
      line: range.start.line + lineOffset,
      offset: sourceOffset + (range.start.offset ?? 0),
    },
    end: {
      ...range.end,
      line: range.end.line + lineOffset,
      offset: sourceOffset + (range.end.offset ?? 0),
    },
  };
}

function vueNodeType(type: number): string {
  if (type === NodeTypes.ROOT) return 'Root';
  if (type === NodeTypes.ELEMENT) return 'Element';
  if (type === NodeTypes.TEXT) return 'Text';
  if (type === NodeTypes.INTERPOLATION) return 'Interpolation';
  if (type === NodeTypes.SIMPLE_EXPRESSION) return 'SimpleExpression';
  if (type === NodeTypes.ATTRIBUTE) return 'Attribute';
  if (type === NodeTypes.DIRECTIVE) return 'Directive';
  if (type === NodeTypes.COMPOUND_EXPRESSION) return 'CompoundExpression';
  return `VueNode(${type})`;
}
