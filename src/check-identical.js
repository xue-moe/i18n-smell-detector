import { classifyIdentical } from './rules/classify-identical.js';

function normalize(value, config) {
  let text = String(value);
  if (config.trimWhitespace ?? true) text = text.trim();
  if (config.ignoreCase ?? false) text = text.toLowerCase();
  return text;
}

/**
 * @param {Record<string, Record<string, string>>} locales
 * @param {import('./types.js').DetectorConfig} config
 * @returns {import('./types.js').IdenticalIssue[]}
 */
export function checkIdenticalTranslations(locales, config) {
  const base = locales[config.baseLocale];
  const issues = [];

  for (const [targetLocale, target] of Object.entries(locales)) {
    if (targetLocale === config.baseLocale) continue;

    for (const [key, baseValue] of Object.entries(base)) {
      if (!(key in target)) continue;
      if (normalize(baseValue, config) !== normalize(target[key], config)) continue;

      const { severity, reason } = classifyIdentical({
        key,
        value: target[key],
        baseLocale: config.baseLocale,
        targetLocale,
        config,
      });

      issues.push({
        key,
        baseLocale: config.baseLocale,
        targetLocale,
        value: target[key],
        severity,
        reason,
      });
    }
  }

  return issues.sort(compareIssues);
}

function compareIssues(a, b) {
  const rank = { high: 3, medium: 2, low: 1, ignored: 0 };
  return rank[b.severity] - rank[a.severity]
    || a.targetLocale.localeCompare(b.targetLocale)
    || a.key.localeCompare(b.key);
}
