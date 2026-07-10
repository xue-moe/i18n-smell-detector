import { checkHardcodedStrings } from './check-hardcoded.js';
import { checkIdenticalTranslations } from './check-identical.js';
import { checkPlaceholders } from './check-placeholders.js';
import { loadFlattenedLocales } from './locale/load-locales.js';
import type { CheckName, CheckResult, DetectorConfig } from './types.js';

const CHECK_META = {
  identical: {
    title: 'identical translations',
    heading: 'Identical translations',
    emptyMessage: 'No copied base-locale values found.',
  },
  hardcoded: {
    title: 'hardcoded strings',
    heading: 'Hardcoded strings',
    emptyMessage: 'No hardcoded strings found.',
  },
  placeholders: {
    title: 'placeholder mismatches',
    heading: 'Placeholder mismatches',
    emptyMessage: 'No placeholder mismatches found.',
  },
} satisfies Record<CheckName, Pick<CheckResult, 'title' | 'heading' | 'emptyMessage'>>;

export async function runChecks(config: DetectorConfig, configDir: string, names: CheckName[]): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  let locales: Record<string, Record<string, string>> | undefined;

  for (const check of names) {
    if (check === 'identical') {
      locales ||= await loadFlattenedLocales(config, configDir);
      results.push({ check, ...CHECK_META[check], issues: checkIdenticalTranslations(locales, config) });
    } else if (check === 'placeholders') {
      locales ||= await loadFlattenedLocales(config, configDir);
      results.push({ check, ...CHECK_META[check], issues: checkPlaceholders(locales, config) });
    } else if (check === 'hardcoded') {
      results.push({ check, ...CHECK_META[check], issues: await checkHardcodedStrings(config, configDir) });
    }
  }

  return results;
}

export function enabledChecks(config: DetectorConfig): CheckName[] {
  const checks: CheckName[] = ['identical', 'hardcoded', 'placeholders'];
  return checks.filter((check) => config.checks[check]);
}
