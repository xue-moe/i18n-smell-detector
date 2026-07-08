import path from 'node:path';
import { checkHardcodedStrings } from './check-hardcoded.js';
import { checkIdenticalTranslations } from './check-identical.js';
import { loadConfig, resolveConfigPath } from './config.js';
import { loadFlattenedLocales } from './locale/load-locales.js';
import { renderReport } from './reporters/index.js';
import { failRank, severityRank } from './severity.js';

const HELP = `
i18n-smell-detector

Usage:
  i18n-smell-detector check-identical [options]
  i18n-smell-detector check-hardcoded [options]
  i18n-smell-detector check [options]

Options:
  -c, --config <path>       Config file path
  --format <format>         console | json | markdown  (default: console)
  --fail-on <level>         high | medium | low | none (default: config.failOn or high)
  --include-ignored         Print ignored matches as well
  -h, --help                Show help

Example:
  i18n-smell-detector check-identical -c i18n-smell.config.mjs --format markdown
  i18n-smell-detector check-hardcoded -c i18n-smell.config.mjs --format json
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith('-') ? args.shift() : 'check-identical';
  const options = { command, format: 'console', includeIgnored: false, help: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-c' || arg === '--config') {
      options.configPath = args[++index];
    } else if (arg === '--format') {
      options.format = readChoice(args[++index], ['console', 'json', 'markdown'], 'format');
    } else if (arg === '--fail-on') {
      options.failOn = readChoice(args[++index], ['none', 'low', 'medium', 'high'], 'fail-on level');
    } else if (arg === '--include-ignored') {
      options.includeIgnored = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function readChoice(value, choices, name) {
  if (!choices.includes(value)) {
    throw new Error(`Unsupported ${name}: ${value}`);
  }
  return value;
}

export async function runCli(argv) {
  const options = parseArgs(argv);

  if (options.help || options.command === 'help') {
    console.log(HELP.trim());
    return;
  }

  if (!['check-identical', 'check-hardcoded', 'check'].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}\n${HELP}`);
  }

  const configPath = await resolveConfigPath(options.configPath, process.cwd());
  const config = await loadConfig(configPath);
  const effectiveConfig = {
    ...config,
    failOn: options.failOn || config.failOn || 'high',
    includeIgnored: options.includeIgnored || config.includeIgnored || false,
  };

  const configDir = path.dirname(configPath);
  const isHardcoded = options.command === 'check-hardcoded';
  const issues = isHardcoded
    ? await checkHardcodedStrings(effectiveConfig, configDir)
    : checkIdenticalTranslations(await loadFlattenedLocales(effectiveConfig, configDir), effectiveConfig);

  console.log(renderReport(issues, {
    format: options.format,
    includeIgnored: effectiveConfig.includeIgnored || false,
    title: isHardcoded ? 'hardcoded strings' : 'identical translations',
    heading: isHardcoded ? 'Hardcoded strings' : 'Identical translations',
    emptyMessage: isHardcoded ? 'No hardcoded strings found.' : 'No copied base-locale values found.',
  }));

  const visible = effectiveConfig.includeIgnored ? issues : issues.filter((issue) => issue.severity !== 'ignored');
  const shouldFail = visible.some((issue) => severityRank[issue.severity] >= failRank(effectiveConfig.failOn || 'high'));
  if (shouldFail) process.exit(1);
}
