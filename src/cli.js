import { access, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { applyBaseline, loadBaseline, writeBaseline } from './baseline.js';
import { loadConfig, resolveConfigPath } from './config.js';
import { appError } from './errors.js';
import { flattenResults, renderCombinedReport, summarizeResults } from './reporters/combined.js';
import { renderReport } from './reporters/index.js';
import { enabledChecks, runChecks } from './run-checks.js';
import { failRank, severityRank } from './severity.js';

const HELP = `
i18n-smell-detector

Usage:
  i18n-smell-detector check-identical [options]
  i18n-smell-detector check-hardcoded [options]
  i18n-smell-detector check-placeholders [options]
  i18n-smell-detector check [options]
  i18n-smell-detector init [options]

Options:
  -c, --config <path>       Config file path
  --format <format>         console | json | markdown | sarif  (default: console)
  --fail-on <level>         high | medium | low | none (default: config.failOn or high)
  --output <path>           Write the full report to a file
  --baseline <path>         Read a baseline file
  --update-baseline         Write the current issues to the baseline file
  --include-ignored         Print ignored matches as well
  --force                   Overwrite an existing config file with init
  -h, --help                Show help

Example:
  i18n-smell-detector check-identical -c i18n-smell.config.mjs --format markdown
  i18n-smell-detector check-hardcoded -c i18n-smell.config.mjs --format json
  i18n-smell-detector check-placeholders -c i18n-smell.config.mjs --format json
  i18n-smell-detector init
`;

const DEFAULT_CONFIG_PATH = 'i18n-smell.config.mjs';

const DEFAULT_CONFIG_TEMPLATE = `export default {
  baseLocale: 'en',
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json'
  },
  source: [
    'src/**/*.{vue,js,jsx,ts,tsx}'
  ],
  failOn: 'none'
};
`;

const LOCALE_DIR_CANDIDATES = [
  'src/locales',
  'src/i18n',
  'locales',
  'i18n',
];

function parseArgs(argv) {
  const program = new Command()
    .name('i18n-smell-detector')
    .usage('[command] [options]')
    .description('Find localization issues that key coverage checks miss.')
    .argument('[command]', 'init | check-identical | check-hardcoded | check-placeholders | check', 'check-identical')
    .option('-c, --config <path>', 'Config file path')
    .option('--format <format>', 'console | json | markdown | sarif', readFormat)
    .option('--fail-on <level>', 'high | medium | low | none', readFailOn)
    .option('--output <path>', 'Write the full report to a file')
    .option('--baseline <path>', 'Read a baseline file')
    .option('--update-baseline', 'Write the current issues to the baseline file', false)
    .option('--include-ignored', 'Print ignored matches as well', false)
    .option('--force', 'Overwrite an existing config file with init', false)
    .addHelpText('after', `

Example:
  i18n-smell-detector check-identical -c i18n-smell.config.mjs --format markdown
  i18n-smell-detector check-hardcoded -c i18n-smell.config.mjs --format json
  i18n-smell-detector check-placeholders -c i18n-smell.config.mjs --format json
  i18n-smell-detector init`)
    .exitOverride()
    .configureOutput({
      writeOut: () => {},
      writeErr: () => {},
      outputError: () => {},
    });

  try {
    program.parse(argv, { from: 'node' });
  } catch (error) {
    if (error.code === 'commander.helpDisplayed') return { help: true };
    throw appError(formatCommanderError(error), 'CLI_USAGE');
  }

  const [command] = program.args;
  if (!['help', 'init', 'check-identical', 'check-hardcoded', 'check-placeholders', 'check'].includes(command)) {
    throw appError(`Unknown command: ${command}\n${HELP}`, 'CLI_USAGE');
  }

  return {
    command,
    configPath: program.opts().config,
    format: program.opts().format,
    failOn: program.opts().failOn,
    output: program.opts().output,
    baseline: program.opts().baseline,
    updateBaseline: program.opts().updateBaseline,
    includeIgnored: program.opts().includeIgnored,
    force: program.opts().force,
    help: false,
  };
}

function readFormat(value) {
  return readChoice(value, ['console', 'json', 'markdown', 'sarif'], 'format');
}

function readFailOn(value) {
  return readChoice(value, ['none', 'low', 'medium', 'high'], 'fail-on level');
}

function readChoice(value, choices, name) {
  if (!choices.includes(value)) throw new InvalidArgumentError(`Unsupported ${name}: ${value}`);
  return value;
}

function formatCommanderError(error) {
  if (error.code === 'commander.unknownOption') return `Unknown option: ${extractQuotedValue(error.message) || error.optionName || ''}`.trim();
  if (error.code === 'commander.missingArgument') return `Missing value for option: ${error.optionName?.() || ''}`.trim();
  return error.message.replace(/^error: /, '');
}

function extractQuotedValue(value) {
  return value.match(/'([^']+)'/)?.[1];
}

export async function runCli(argv) {
  const options = parseArgs(argv);

  if (options.help || options.command === 'help') {
    console.log(HELP.trim());
    return;
  }

  if (options.command === 'init') {
    await writeDefaultConfig(options.configPath || DEFAULT_CONFIG_PATH, process.cwd(), options.force);
    return;
  }

  const configPath = await resolveConfigPath(options.configPath, process.cwd());
  const config = await loadConfig(configPath);
  const effectiveConfig = {
    ...config,
    failOn: options.failOn || config.failOn || 'high',
    format: options.format || config.format || 'console',
    output: options.output || config.output,
    baseline: options.baseline || config.baseline,
    includeIgnored: options.includeIgnored || config.includeIgnored || false,
  };

  const configDir = path.dirname(configPath);
  const checks = commandChecks(options.command, effectiveConfig);
  const rawResults = await runChecks(effectiveConfig, configDir, checks);

  if (options.updateBaseline) {
    if (!effectiveConfig.baseline) throw appError('Baseline path is required for --update-baseline', 'CLI_USAGE');
    const baselinePath = resolveFromConfigDir(effectiveConfig.baseline, configDir);
    const count = await writeBaseline(baselinePath, rawResults);
    console.log(`Baseline updated: ${effectiveConfig.baseline} (${count} issues)`);
    return;
  }

  const baselineIds = await loadBaseline(resolveOptional(effectiveConfig.baseline, configDir));
  const results = applyBaseline(rawResults, baselineIds);
  const reportOptions = {
    format: effectiveConfig.format,
    includeIgnored: effectiveConfig.includeIgnored || false,
  };
  const report = options.command === 'check'
    ? renderCombinedReport(results, reportOptions)
    : renderSingleReport(results[0], reportOptions);

  if (effectiveConfig.output) {
    await writeOutput(resolveFromConfigDir(effectiveConfig.output, configDir), report);
    console.log(renderWriteSummary(results, effectiveConfig.output));
  } else {
    console.log(report);
  }

  const visible = options.command === 'check'
    ? flattenResults(results, { includeIgnored: effectiveConfig.includeIgnored || false })
    : visibleIssues(results[0].issues, effectiveConfig.includeIgnored || false);
  const shouldFail = visible.some((issue) => severityRank[issue.severity] >= failRank(effectiveConfig.failOn || 'high'));
  if (shouldFail) process.exit(1);
}

function commandChecks(command, config) {
  if (command === 'check-identical') return ['identical'];
  if (command === 'check-hardcoded') return ['hardcoded'];
  if (command === 'check-placeholders') return ['placeholders'];
  return enabledChecks(config);
}

function renderSingleReport(result, options) {
  return renderReport(result.issues, {
    ...options,
    title: result.title,
    heading: result.heading,
    emptyMessage: result.emptyMessage,
    check: result.check,
  });
}

function visibleIssues(issues, includeIgnored) {
  return includeIgnored ? issues : issues.filter((issue) => issue.severity !== 'ignored');
}

function resolveFromConfigDir(filePath, configDir) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(configDir, filePath);
}

function resolveOptional(filePath, configDir) {
  return filePath ? resolveFromConfigDir(filePath, configDir) : undefined;
}

async function writeOutput(filePath, report) {
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, report);
  } catch (error) {
    throw appError(`Failed to write report file: ${filePath}\nReason: ${error.message}`, 'OUTPUT_WRITE_FAILED');
  }
}

async function writeDefaultConfig(configPath, cwd, force) {
  const target = path.isAbsolute(configPath) ? configPath : path.resolve(cwd, configPath);

  if (!force && await exists(target)) {
    throw appError(`Config file already exists: ${target}\nUse --force to overwrite it.`, 'CONFIG_EXISTS');
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await createConfigTemplate(path.dirname(target)));
  console.log(`Created ${path.relative(cwd, target) || target}`);
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function renderWriteSummary(results, output) {
  const summary = summarizeResults(results);
  const counts = Object.entries(summary)
    .map(([check, item]) => `${check}: high=${item.high} medium=${item.medium} low=${item.low} ignored=${item.ignored}`)
    .join('; ');
  return `Report written to ${output}\n${counts}`;
}

async function createConfigTemplate(baseDir) {
  const locales = await discoverLocaleFiles(baseDir);
  if (locales.length === 0) return DEFAULT_CONFIG_TEMPLATE;

  const baseLocale = locales.some((locale) => locale.name === 'en') ? 'en' : locales[0].name;
  const localeLines = locales.map((locale, index) => {
    const suffix = index === locales.length - 1 ? '' : ',';
    return `    ${quoteProperty(locale.name)}: '${locale.path}'${suffix}`;
  });

  return `export default {
  baseLocale: '${baseLocale}',
  locales: {
${localeLines.join('\n')}
  },
  source: [
    'src/**/*.{vue,js,jsx,ts,tsx}'
  ],
  failOn: 'none'
};
`;
}

async function discoverLocaleFiles(baseDir) {
  for (const dir of LOCALE_DIR_CANDIDATES) {
    const absoluteDir = path.resolve(baseDir, dir);
    let entries;
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch {
      continue;
    }

    const locales = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => {
        const localeName = entry.name.slice(0, -'.json'.length);
        const relativePath = toConfigPath(path.relative(baseDir, path.join(absoluteDir, entry.name)));
        return { name: localeName, path: relativePath };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (locales.length > 0) return locales;
  }

  return [];
}

function toConfigPath(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

function quoteProperty(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}
