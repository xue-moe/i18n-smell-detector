import type { FailOnLevel, Severity } from './types.js';

export const severityRank: Record<Severity, number> = {
  ignored: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function failRank(failOn: FailOnLevel): number {
  return failOn === 'none' ? Number.POSITIVE_INFINITY : severityRank[failOn];
}
