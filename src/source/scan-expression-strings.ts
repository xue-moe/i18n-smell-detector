import { parseExpression } from '@babel/parser';
import type { SourceRange } from '../types.js';
import { rangeFromOffsets } from './source-range.js';

type ExpressionNode = Record<string, unknown> & {
  type?: string;
  start?: number | null;
  end?: number | null;
};

export interface ExpressionString {
  value: string;
  range: SourceRange;
  expressionKind: string;
  nodeType: string;
  containsInterpolation: boolean;
}

export function scanExpressionStrings(
  expressionSource: string,
  {
    fileSource,
    sourceOffset = 0,
  }: {
    fileSource?: string;
    sourceOffset?: number;
  } = {},
): ExpressionString[] {
  const root = parseExpression(expressionSource, {
    plugins: ['typescript'],
    createParenthesizedExpressions: true,
  }) as unknown as ExpressionNode;
  const results: ExpressionString[] = [];

  collect(root, root.type || 'Expression', results, expressionSource, fileSource, sourceOffset);
  return results;
}

function collect(
  node: ExpressionNode | null | undefined,
  expressionKind: string,
  results: ExpressionString[],
  expressionSource: string,
  fileSource: string | undefined,
  sourceOffset: number,
): void {
  if (!node?.type) return;

  if (node.type === 'StringLiteral') {
    const value = typeof node.value === 'string' ? node.value : '';
    const range = nodeRange(node, expressionSource, fileSource, sourceOffset);
    if (value && range) {
      results.push({ value, range, expressionKind, nodeType: node.type, containsInterpolation: false });
    }
    return;
  }

  if (node.type === 'ConditionalExpression') {
    collect(asNode(node.consequent), expressionKind, results, expressionSource, fileSource, sourceOffset);
    collect(asNode(node.alternate), expressionKind, results, expressionSource, fileSource, sourceOffset);
    return;
  }

  if (node.type === 'LogicalExpression') {
    collect(asNode(node.left), expressionKind, results, expressionSource, fileSource, sourceOffset);
    collect(asNode(node.right), expressionKind, results, expressionSource, fileSource, sourceOffset);
    return;
  }

  if (node.type === 'ParenthesizedExpression') {
    collect(asNode(node.expression), expressionKind, results, expressionSource, fileSource, sourceOffset);
    return;
  }

  if (node.type === 'TemplateLiteral') {
    const containsInterpolation = asArray(node.expressions).length > 0;
    for (const quasi of asArray(node.quasis)) {
      const quasiNode = asNode(quasi);
      const valueRecord = asNode(quasiNode?.value);
      const value = typeof valueRecord?.cooked === 'string' ? valueRecord.cooked : String(valueRecord?.raw ?? '');
      const range = nodeRange(quasiNode, expressionSource, fileSource, sourceOffset);
      if (value && range) {
        results.push({
          value,
          range,
          expressionKind,
          nodeType: 'TemplateElement',
          containsInterpolation,
        });
      }
    }
  }
}

function nodeRange(
  node: ExpressionNode | null | undefined,
  expressionSource: string,
  fileSource: string | undefined,
  sourceOffset: number,
): SourceRange | undefined {
  if (!node || typeof node.start !== 'number' || typeof node.end !== 'number') return undefined;
  if (fileSource) return rangeFromOffsets(fileSource, sourceOffset + node.start, sourceOffset + node.end);

  const range = rangeFromOffsets(expressionSource, node.start, node.end);
  return {
    start: { ...range.start, offset: sourceOffset + (range.start.offset ?? 0) },
    end: { ...range.end, offset: sourceOffset + (range.end.offset ?? 0) },
  };
}

function asNode(value: unknown): ExpressionNode | undefined {
  return value && typeof value === 'object' ? (value as ExpressionNode) : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
