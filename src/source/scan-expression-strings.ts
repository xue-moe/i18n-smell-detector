import { parseExpression } from '@babel/parser';
import { extractMessageCandidates, type MessageCandidate, type MessageNode } from './extract-message-candidates.js';

export type ExpressionString = MessageCandidate;

export function scanExpressionStrings(
  expressionSource: string,
  { fileSource, sourceOffset = 0 }: { fileSource?: string; sourceOffset?: number } = {},
): ExpressionString[] {
  const root = parseExpression(expressionSource, {
    plugins: ['typescript'],
    createParenthesizedExpressions: true,
  }) as unknown as MessageNode;
  return extractMessageCandidates(root, expressionSource, {
    fileSource,
    sourceOffset,
    expressionKind: root.type,
  });
}
