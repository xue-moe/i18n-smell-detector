import { matchesAnyRule } from './match-rule.js';

export function matchesAnyPattern(value, patterns = []) {
  return matchesAnyRule(value, patterns, { wildcard: true });
}
