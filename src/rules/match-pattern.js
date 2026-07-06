function patternToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);
}

export function matchesAnyPattern(value, patterns = []) {
  return patterns.some((pattern) => patternToRegExp(pattern).test(value));
}
