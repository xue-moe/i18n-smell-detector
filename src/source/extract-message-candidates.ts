import type { MessageInterpolation, SourceRange } from '../types.js';
import { rangeFromOffsets } from './source-range.js';

export type MessageNode = Record<string, unknown> & { type?: string; start?: number | null; end?: number | null };

export interface MessageCandidate {
  value: string;
  rawValue?: string;
  range: SourceRange;
  nodeType: string;
  expressionKind: string;
  containsInterpolation: boolean;
  interpolations?: MessageInterpolation[];
}

export function extractMessageCandidates(
  node: MessageNode | null | undefined,
  source: string,
  {
    fileSource,
    sourceOffset = 0,
    expressionKind = node?.type || 'Expression',
  }: {
    fileSource?: string;
    sourceOffset?: number;
    expressionKind?: string;
  } = {},
): MessageCandidate[] {
  if (!node?.type) return [];
  if (node.type === 'StringLiteral') {
    const range = nodeRange(node, source, fileSource, sourceOffset);
    const value = typeof node.value === 'string' ? node.value : '';
    return range && value
      ? [
          {
            value,
            rawValue: sliceNode(node, source),
            range,
            nodeType: node.type,
            expressionKind,
            containsInterpolation: false,
          },
        ]
      : [];
  }
  if (node.type === 'TemplateLiteral') return templateCandidate(node, source, fileSource, sourceOffset, expressionKind);
  if (node.type === 'ConditionalExpression')
    return [
      ...extractMessageCandidates(asNode(node.consequent), source, { fileSource, sourceOffset, expressionKind }),
      ...extractMessageCandidates(asNode(node.alternate), source, { fileSource, sourceOffset, expressionKind }),
    ];
  if (node.type === 'LogicalExpression')
    return [
      ...extractMessageCandidates(asNode(node.left), source, { fileSource, sourceOffset, expressionKind }),
      ...extractMessageCandidates(asNode(node.right), source, { fileSource, sourceOffset, expressionKind }),
    ];
  if (['ParenthesizedExpression', 'TSAsExpression', 'TSTypeAssertion', 'TSNonNullExpression'].includes(node.type)) {
    return extractMessageCandidates(asNode(node.expression), source, { fileSource, sourceOffset, expressionKind });
  }
  return [];
}

function templateCandidate(
  node: MessageNode,
  source: string,
  fileSource: string | undefined,
  sourceOffset: number,
  expressionKind: string,
): MessageCandidate[] {
  const range = nodeRange(node, source, fileSource, sourceOffset);
  if (!range) return [];
  const quasis = asArray(node.quasis).map(asNode);
  const expressions = asArray(node.expressions).map(asNode);
  const interpolations: MessageInterpolation[] = [];
  const used = new Set<string>();
  let complexIndex = 1;
  let value = '';
  for (let index = 0; index < quasis.length; index += 1) {
    const quasiValue = asNode(quasis[index]?.value);
    value += typeof quasiValue?.cooked === 'string' ? quasiValue.cooked : String(quasiValue?.raw ?? '');
    const expression = expressions[index];
    if (!expression) continue;
    const expressionText = sliceNode(expression, source);
    let name = simpleExpressionName(expression) || '';
    if (!name || used.has(name)) name = `expression${complexIndex++}`;
    used.add(name);
    const interpolationRange = nodeRange(expression, source, fileSource, sourceOffset);
    if (interpolationRange)
      interpolations.push({ placeholder: name, expression: expressionText, range: interpolationRange });
    value += `{${name}}`;
  }
  return value
    ? [
        {
          value,
          rawValue: sliceNode(node, source),
          range,
          nodeType: node.type || 'TemplateLiteral',
          expressionKind,
          containsInterpolation: expressions.length > 0,
          ...(interpolations.length ? { interpolations } : {}),
        },
      ]
    : [];
}

function simpleExpressionName(node: MessageNode): string | undefined {
  if (node.type === 'Identifier' && typeof node.name === 'string') return node.name;
  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const object = simpleExpressionName(asNode(node.object) || {});
    const property = node.computed ? undefined : simpleExpressionName(asNode(node.property) || {});
    return object && property ? `${object}.${property}` : undefined;
  }
  return undefined;
}

function nodeRange(node: MessageNode, source: string, fileSource?: string, sourceOffset = 0): SourceRange | undefined {
  if (typeof node.start !== 'number' || typeof node.end !== 'number') return undefined;
  return fileSource
    ? rangeFromOffsets(fileSource, sourceOffset + node.start, sourceOffset + node.end)
    : rangeFromOffsets(source, node.start, node.end);
}
function sliceNode(node: MessageNode, source: string): string {
  return typeof node.start === 'number' && typeof node.end === 'number' ? source.slice(node.start, node.end) : '';
}
function asNode(value: unknown): MessageNode | undefined {
  return value && typeof value === 'object' ? (value as MessageNode) : undefined;
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
