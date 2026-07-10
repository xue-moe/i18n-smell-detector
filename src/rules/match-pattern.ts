import { matchesAnyRule } from './match-rule.js';
import type { Rule } from '../types.js';

export function matchesAnyPattern(value: string, patterns: Rule[] = []): boolean {
  return matchesAnyRule(value, patterns, { wildcard: true });
}
