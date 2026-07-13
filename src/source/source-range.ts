import type { SourcePosition, SourceRange } from '../types.js';
import { createHash } from 'node:crypto';

export function positionAt(source: string, offset: number): SourcePosition {
  const safeOffset = Math.max(0, Math.min(offset, source.length));
  const before = source.slice(0, safeOffset);
  const lastNewline = before.lastIndexOf('\n');

  return {
    line: before.split('\n').length,
    column: safeOffset - lastNewline,
    offset: safeOffset,
  };
}

export function sourceAnchor(
  source: string,
  parentStart: number,
  parentEnd: number,
  childStart: number,
  childEnd: number,
) {
  const relativeRange = { start: childStart - parentStart, end: childEnd - parentStart };
  const parentSource = source.slice(parentStart, parentEnd).replace(/\s+/gu, ' ').trim();
  const contextHash = createHash('sha256')
    .update(JSON.stringify({ parentSource, relativeRange }))
    .digest('hex')
    .slice(0, 20);
  return { contextHash, relativeRange };
}

export function rangeFromOffsets(source: string, startOffset: number, endOffset: number): SourceRange {
  return {
    start: positionAt(source, startOffset),
    end: positionAt(source, endOffset),
  };
}
