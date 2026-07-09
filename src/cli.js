import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { applyBaseline, loadBaseline, writeBaseline } from './baseline.js';
import { loadConfig, resolveConfigPath } from './config.js';
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

Options:
  -c, --config <path>       Config file path
  --format <format>         console | json | markdown | sarif  (default: console)
  --fail-on <level>         high | medium | low | none (default: config.failOn or high)
  --output <path>           Write the full report to a file
  --baseline <path>         Read a baseline file
  --update-baseline         Write the current issues to the baseline file
  --include-ignored         Print ignored matches as well
  -h, --help                Show help

Example:
  i18n-smell-detector check-identical -c i18n-smell.config.mjs --format markdown
  i18n-smell-detector check-hardcoded -c i18n-smell.config.mjs --format json
  i18n-smell-detector check-placeholders -c i18n-smell.config.mjs --format json
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith('-') ? args.shift() : 'check-identical';
  const options = { command, includeIgnored: false, help: false, updateBaseline: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-c' || arg === '--config') {
      options.configPath = args[++index];
    } else if (arg === '--format') {
      options.format = readChoice(args[++index], ['console', 'json', 'markdown', 'sarif'], 'format');
    } else if (arg === '--fail-on') {
      options.failOn = readChoice(args[++index], ['none', 'low', 'medium', 'high'], 'fail-on level');
    } else if (arg === '--output') {
      options.output = args[++index];
    } else if (arg === '--baseline') {
      options.baseline = args[++index];
    } else if (arg === '--update-baseline') {
      options.updateBaseline = true;
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

  if (!['check-identical', 'check-hardcoded', 'check-placeholders', 'check'].includes(options.command)) {
    throw new Error(`Unknown command: ${options.command}\n${HELP}`);
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
    if (!effectiveConfig.baseline) throw new Error('Baseline path is required for --update-baseline');
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
    throw new Error(`Failed to write report file: ${filePath}\nReason: ${error.message}`);
  }
}

function renderWriteSummary(results, output) {
  const summary = summarizeResults(results);
  const counts = Object.entries(summary)
    .map(([check, item]) => `${check}: high=${item.high} medium=${item.medium} low=${item.low} ignored=${item.ignored}`)
    .join('; ');
  return `Report written to ${output}\n${counts}`;
}
