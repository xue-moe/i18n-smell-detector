import type { DetectorConfig, PlaceholderIssue } from './types.js';

type PlaceholderConfig = Partial<DetectorConfig> & {
  baseLocale: string;
  placeholderPatterns: RegExp[];
};

function compareIssues(a: PlaceholderIssue, b: PlaceholderIssue) {
  const rank = { high: 3, medium: 2, low: 1, ignored: 0 };
  return (
    rank[b.severity] - rank[a.severity] || a.targetLocale.localeCompare(b.targetLocale) || a.key.localeCompare(b.key)
  );
}

export function extractPlaceholders(value: string, patterns: RegExp[]) {
  const placeholders = new Set<string>();
  const text = String(value);

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      placeholders.add(match[0]);
    }
  }

  return [...placeholders].sort();
}

/**
 * @param {Record<string, Record<string, string>>} locales
 * @param {import('./types.js').DetectorConfig} config
 * @returns {import('./types.js').PlaceholderIssue[]}
 */
export function checkPlaceholders(
  locales: Record<string, Record<string, string>>,
  config: PlaceholderConfig,
): PlaceholderIssue[] {
  const base = locales[config.baseLocale];
  const issues: PlaceholderIssue[] = [];

  for (const [targetLocale, target] of Object.entries(locales)) {
    if (targetLocale === config.baseLocale) continue;

    for (const [key, baseValue] of Object.entries(base)) {
      if (!(key in target)) continue;

      const basePlaceholders = extractPlaceholders(baseValue, config.placeholderPatterns);
      const targetPlaceholders = extractPlaceholders(target[key], config.placeholderPatterns);
      const targetSet = new Set(targetPlaceholders);
      const baseSet = new Set(basePlaceholders);
      const missing = basePlaceholders.filter((placeholder) => !targetSet.has(placeholder));
      const extra = targetPlaceholders.filter((placeholder) => !baseSet.has(placeholder));

      if (missing.length === 0 && extra.length === 0) continue;

      issues.push({
        key,
        baseLocale: config.baseLocale,
        targetLocale,
        value: target[key],
        missing,
        extra,
        severity: missing.length > 0 ? 'high' : 'medium',
        reason: missing.length > 0 ? 'missing placeholder' : 'extra placeholder',
      });
    }
  }

  return issues.sort(compareIssues);
}
