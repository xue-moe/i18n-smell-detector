import { checkHardcodedStrings } from './check-hardcoded.js';
import { checkIdenticalTranslations } from './check-identical.js';
import { checkPlaceholders } from './check-placeholders.js';
import { loadFlattenedLocales } from './locale/load-locales.js';

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
};

export async function runChecks(config, configDir, names) {
  const results = [];
  let locales;

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

export function enabledChecks(config) {
  return ['identical', 'hardcoded', 'placeholders'].filter((check) => config.checks[check]);
}
