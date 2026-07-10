export const severityRank = {
  ignored: 0,
  low: 1,
  medium: 2,
  high: 3,
};

export function failRank(failOn) {
  return failOn === 'none' ? Number.POSITIVE_INFINITY : severityRank[failOn];
}
