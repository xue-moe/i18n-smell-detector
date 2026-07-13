import { readFile } from 'node:fs/promises';
import { parse } from '@babel/parser';
import { classifyHardcoded } from '../rules/classify-hardcoded.js';
import type { HardcodedConfig, HardcodedIssue, SourceRange } from '../types.js';
import { rangeFromOffsets, sourceAnchor } from './source-range.js';
import { extractMessageCandidates, type MessageNode } from './extract-message-candidates.js';

type HardcodedScanConfig = { hardcoded: Partial<HardcodedConfig> };

type SourceLocation = {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
};

type AstNode = Record<string, unknown> & {
  type?: string;
  loc?: SourceLocation | null;
  start?: number | null;
  end?: number | null;
};

const SKIP_KEYS = new Set([
  'comments',
  'errors',
  'extra',
  'leadingComments',
  'loc',
  'range',
  'start',
  'end',
  'trailingComments',
]);

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function makeIssue({
  file,
  source,
  fileSource,
  sourceOffset,
  lineOffset,
  node,
  parentNode,
  value,
  kind,
  baseReason,
  config,
}: {
  file: string;
  source: string;
  fileSource?: string;
  sourceOffset: number;
  lineOffset: number;
  node: AstNode | null | undefined;
  parentNode?: AstNode;
  value: string;
  kind: string;
  baseReason: string;
  config: HardcodedScanConfig;
}): HardcodedIssue | null {
  const text = normalizeText(value);
  const range = resolveNodeRange(source, node, { fileSource, sourceOffset, lineOffset });
  if (!text || !range) return null;

  const classification = classifyHardcoded(text, config);
  const anchor = anchorFor(source, node, parentNode);
  return {
    file,
    line: range.start.line,
    column: range.start.column,
    value: text,
    severity: classification.severity,
    reason: classification.severity === 'ignored' ? classification.reason : baseReason,
    kind,
    range,
    nodeType: node?.type,
    parentNodeType: parentNode?.type,
    containsInterpolation: node?.type === 'TemplateLiteral' && asArray(node.expressions).length > 0,
    ...anchor,
  };
}

export async function scanJsSource(file: string, config: HardcodedScanConfig): Promise<HardcodedIssue[]> {
  const source = await readFile(file, 'utf8');
  return scanJsText(source, { file, config });
}

export function scanJsText(
  source: string,
  {
    file,
    config,
    lineOffset = 0,
    sourceOffset = 0,
    fileSource,
  }: {
    file: string;
    config: HardcodedScanConfig;
    lineOffset?: number;
    sourceOffset?: number;
    fileSource?: string;
  },
): HardcodedIssue[] {
  let ast: AstNode;

  try {
    ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
      errorRecovery: false,
    }) as unknown as AstNode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Malformed JavaScript or TypeScript file ${file}: ${message}`);
  }

  const issues: HardcodedIssue[] = [];
  const functions = new Set(config.hardcoded.functions || []);
  const jsxAttributes = new Set(config.hardcoded.jsxAttributes || []);
  const assignmentSinks = new Set(config.hardcoded.sinks?.assignments || []);
  const propertySinks = new Set(config.hardcoded.sinks?.properties || []);
  const callSinks = new Map<string, Set<number>>();
  for (const sink of config.hardcoded.sinks?.calls || []) {
    const indexes = callSinks.get(sink.callee) || new Set<number>();
    for (const index of sink.arguments) indexes.add(index);
    callSinks.set(sink.callee, indexes);
  }

  const addCandidates = (
    valueNode: AstNode | null | undefined,
    parentNode: AstNode,
    kind: string,
    baseReason: string,
  ) => {
    for (const candidate of extractMessageCandidates(valueNode as MessageNode, source, {
      fileSource,
      sourceOffset,
      expressionKind: valueNode?.type,
    })) {
      const text = normalizeText(candidate.value);
      if (!text) continue;
      const classification = classifyHardcoded(text, config);
      const childStart = (candidate.range.start.offset ?? sourceOffset) - (fileSource ? sourceOffset : 0);
      const childEnd = (candidate.range.end.offset ?? sourceOffset) - (fileSource ? sourceOffset : 0);
      const anchor = anchorForOffsets(source, parentNode, childStart, childEnd);
      issues.push({
        file,
        line: candidate.range.start.line + (!fileSource ? lineOffset : 0),
        column: candidate.range.start.column,
        value: text,
        rawValue: candidate.rawValue,
        interpolations: candidate.interpolations,
        severity: classification.severity,
        reason: classification.severity === 'ignored' ? classification.reason : baseReason,
        kind,
        range: candidate.range,
        nodeType: candidate.nodeType,
        parentNodeType: parentNode.type,
        containsInterpolation: candidate.containsInterpolation,
        ...anchor,
      });
    }
  };

  walk(ast, (node, parent) => {
    if (node.type === 'CallExpression') {
      const callee = calleeName(node.callee as AstNode);
      const selectedArguments = callSinks.get(callee);
      const argumentsToScan = asArray(node.arguments);

      for (const [index, argument] of argumentsToScan.entries()) {
        if (!functions.has(callee) && !selectedArguments?.has(index)) continue;
        if (!isAstNode(argument)) continue;
        addCandidates(argument, node, `js-call:${callee}`, `static string passed to ${callee}`);
      }
      if (functions.has(callee) || selectedArguments) return;
    }

    if (node.type === 'AssignmentExpression') {
      const target = calleeName(node.left as AstNode);
      if (!assignmentSinks.has(target)) return;
      const valueNode = node.right as AstNode | null | undefined;
      addCandidates(valueNode, node, `js-assignment:${target}`, `static string assigned to ${target}`);
      return;
    }

    if (node.type === 'ObjectProperty') {
      const property = propertyName(node.key as AstNode, Boolean(node.computed));
      if (!propertySinks.has(property)) return;
      const valueNode = node.value as AstNode | null | undefined;
      addCandidates(valueNode, node, `js-property:${property}`, `static string in ${property} property`);
      return;
    }

    if (node.type === 'JSXText') {
      const issue = makeIssue({
        file,
        source,
        fileSource,
        sourceOffset,
        lineOffset,
        node,
        parentNode: parent,
        value: stringField(node, 'value'),
        kind: 'jsx-text',
        baseReason: 'static JSX text',
        config,
      });
      if (issue) issues.push(issue);
      return;
    }

    if (node.type === 'JSXAttribute' && jsxAttributes.has(jsxName(node.name))) {
      const valueNode = node.value as AstNode | null | undefined;
      const value = staticString(valueNode);
      if (value === null) return;

      const issue = makeIssue({
        file,
        source,
        fileSource,
        sourceOffset,
        lineOffset,
        node: valueNode,
        parentNode: node,
        value,
        kind: `jsx-attribute:${jsxName(node.name)}`,
        baseReason: `static ${jsxName(node.name)} attribute`,
        config,
      });
      if (issue) issues.push(issue);
    }
  });

  return issues;
}

function anchorFor(source: string, node?: AstNode | null, parent?: AstNode): ReturnType<typeof sourceAnchor> | {} {
  if (!node || !parent || typeof node.start !== 'number' || typeof node.end !== 'number') return {};
  return anchorForOffsets(source, parent, node.start, node.end);
}

function anchorForOffsets(
  source: string,
  parent: AstNode,
  childStart: number,
  childEnd: number,
): ReturnType<typeof sourceAnchor> | {} {
  if (typeof parent.start !== 'number' || typeof parent.end !== 'number') return {};
  return sourceAnchor(source, parent.start, parent.end, childStart, childEnd);
}

function walk(node: unknown, visitor: (node: AstNode, parent?: AstNode) => void, parent?: AstNode): void {
  if (!isAstNode(node)) return;
  if (!node || typeof node.type !== 'string') return;
  visitor(node, parent);

  for (const [key, value] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visitor, node);
    } else if (isAstNode(value)) {
      walk(value, visitor, node);
    }
  }
}

function resolveNodeRange(
  source: string,
  node: AstNode | null | undefined,
  { fileSource, sourceOffset, lineOffset }: { fileSource?: string; sourceOffset: number; lineOffset: number },
): SourceRange | undefined {
  if (!node || typeof node.start !== 'number' || typeof node.end !== 'number') return undefined;

  if (fileSource) {
    return rangeFromOffsets(fileSource, sourceOffset + node.start, sourceOffset + node.end);
  }

  const range = rangeFromOffsets(source, node.start, node.end);
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

function calleeName(node: AstNode | null | undefined): string {
  if (!node) return '';
  if (node.type === 'Identifier') return stringField(node, 'name');
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'Super') return 'super';
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const object = calleeName(node.object as AstNode);
    const property = node.computed ? staticString(node.property as AstNode) : calleeName(node.property as AstNode);
    return object && property ? `${object}.${property}` : '';
  }
  return '';
}

function propertyName(node: AstNode | null | undefined, computed: boolean): string {
  if (!node) return '';
  if (node.type === 'Identifier' && !computed) return stringField(node, 'name');
  return staticString(node) || '';
}

function jsxName(node: unknown): string {
  if (!isAstNode(node)) return '';
  if (!node) return '';
  if (node.type === 'JSXIdentifier') return stringField(node, 'name');
  if (node.type === 'JSXNamespacedName') return `${jsxName(node.namespace)}:${jsxName(node.name)}`;
  return '';
}

function staticString(node: AstNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'StringLiteral') return stringField(node, 'value');
  if (node.type === 'TemplateLiteral' && asArray(node.expressions).length === 0) {
    return asArray(node.quasis)
      .map((quasi) => {
        const value = isAstNode(quasi) && isAstNode(quasi.value) ? quasi.value : {};
        return typeof value.cooked === 'string' ? value.cooked : String(value.raw ?? '');
      })
      .join('');
  }
  if (node.type === 'JSXExpressionContainer') return staticString(node.expression as AstNode);
  return null;
}

function isAstNode(value: unknown): value is AstNode {
  return !!value && typeof value === 'object';
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringField(node: AstNode, key: string): string {
  const value = node[key];
  return typeof value === 'string' ? value : '';
}
