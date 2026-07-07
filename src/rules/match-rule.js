function wildcardToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

function testRegExp(value, pattern) {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

export function matchesRule(value, rule, options = {}) {
  if (rule instanceof RegExp) return testRegExp(value, rule);
  if (typeof rule !== 'string') return false;

  if (options.wildcard) return wildcardToRegExp(rule).test(value);
  return value === rule;
}

export function matchesAnyRule(value, rules = [], options = {}) {
  return rules.some((rule) => matchesRule(value, rule, options));
}
