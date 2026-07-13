import type { SourcePosition, SourceRange } from '../types.js';

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

export function rangeFromOffsets(source: string, startOffset: number, endOffset: number): SourceRange {
  return {
    start: positionAt(source, startOffset),
    end: positionAt(source, endOffset),
  };
}
