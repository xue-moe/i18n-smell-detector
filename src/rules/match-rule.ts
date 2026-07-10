import type { Rule } from '../types.js';

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

function testRegExp(value: string, pattern: RegExp): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

export function matchesRule(value: string, rule: Rule, options: { wildcard?: boolean } = {}): boolean {
  if (rule instanceof RegExp) return testRegExp(value, rule);
  if (typeof rule !== 'string') return false;

  if (options.wildcard) return wildcardToRegExp(rule).test(value);
  return value === rule;
}

export function matchesAnyRule(value: string, rules: Rule[] = [], options: { wildcard?: boolean } = {}): boolean {
  return rules.some((rule) => matchesRule(value, rule, options));
}
