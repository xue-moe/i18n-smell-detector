# i18n-smell-detector

[![npm version](https://img.shields.io/npm/v/i18n-smell-detector.svg)](https://www.npmjs.com/package/i18n-smell-detector)
[![CI](https://github.com/xue-moe/i18n-smell-detector/actions/workflows/ci.yml/badge.svg)](https://github.com/xue-moe/i18n-smell-detector/actions/workflows/ci.yml)
[![Socket Badge](https://badge.socket.dev/npm/package/i18n-smell-detector)](https://badge.socket.dev/npm/package/i18n-smell-detector)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Find localization issues that key coverage checks miss.

`i18n-smell-detector` checks locale files for copied base-locale values and placeholder mismatches. It can also scan Vue, JavaScript, TypeScript, JSX, and TSX source for hardcoded user-visible strings.

The classifier is deterministic and conservative. Start with `--fail-on none`, review the report, then tune allowlists before enforcing CI.

## Features

- Detect copied base-locale values.
- Detect missing or extra placeholders.
- Detect hardcoded user-visible strings in Vue, JS, TS, JSX, and TSX.
- Output console, JSON, Markdown, SARIF, or HTML reports.
- Support baselines for gradual adoption.
- Publish TypeScript types and a small public API for integrations.

## Install

```bash
npm install -D i18n-smell-detector
```

## Quick Start

```bash
npx i18n-smell-detector init
npx i18n-smell-detector check --config i18n-smell.config.mjs --fail-on none
```

`init` creates `i18n-smell.config.mjs`. When it finds locale JSON files in `src/locales`, `src/i18n`, `locales`, or `i18n`, it writes them into the config automatically.

A typical config:

```js
export default {
  baseLocale: 'en',
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json',
    'zh-Hans': './src/locales/zh-Hans.json',
  },
  source: ['src/**/*.{vue,js,jsx,ts,tsx}'],
  failOn: 'none',
};
```

Locale keys that contain `-`, such as `'zh-Hans'`, must be quoted.

## Commands

```bash
npx i18n-smell-detector check --config i18n-smell.config.mjs
npx i18n-smell-detector check-identical --config i18n-smell.config.mjs
npx i18n-smell-detector check-hardcoded --config i18n-smell.config.mjs
npx i18n-smell-detector check-placeholders --config i18n-smell.config.mjs
```

Common options:

| Option                | Description                                        |
| --------------------- | -------------------------------------------------- |
| `-c, --config <path>` | Use a specific config file.                        |
| `--format <format>`   | `console`, `json`, `markdown`, `sarif`, or `html`. |
| `--output <path>`     | Write the full report to a file.                   |
| `--fail-on <level>`   | `high`, `medium`, `low`, or `none`.                |
| `--baseline <path>`   | Suppress findings stored in a baseline file.       |
| `--update-baseline`   | Write current findings to the baseline file.       |
| `--include-ignored`   | Include ignored findings in the report.            |
| `--debug`             | Print stack traces for troubleshooting.            |

## Reports

```bash
npx i18n-smell-detector check --format markdown --output reports/i18n-smell.md
npx i18n-smell-detector check --format html --output reports/i18n-smell.html
npx i18n-smell-detector check --format sarif --output reports/i18n-smell.sarif
```

Use `--format json` for automation and `--format sarif` for code-scanning tools.

## CI

Start in reporting mode:

```bash
npx i18n-smell-detector check --config i18n-smell.config.mjs --fail-on none
```

After tuning allowlists and baselines, enforce a severity threshold:

```bash
npx i18n-smell-detector check --config i18n-smell.config.mjs --fail-on high
```

## TypeScript API

The package exposes types and a small public API from the package root:

```ts
import { checkIdenticalTranslations, severityRank } from 'i18n-smell-detector';
import type { DetectorConfigInput, DetectorIssue, CheckResult } from 'i18n-smell-detector';
```

## Documentation

Full documentation lives in the GitHub Wiki:

- [Home](https://github.com/xue-moe/i18n-smell-detector/wiki)
- [Getting started](https://github.com/xue-moe/i18n-smell-detector/wiki/Getting-Started)
- [Commands](https://github.com/xue-moe/i18n-smell-detector/wiki/Commands)
- [Configuration](https://github.com/xue-moe/i18n-smell-detector/wiki/Configuration)
- [Checks](https://github.com/xue-moe/i18n-smell-detector/wiki/Checks)
- [Reports and CI](https://github.com/xue-moe/i18n-smell-detector/wiki/Reports-and-CI)
- [Baseline](https://github.com/xue-moe/i18n-smell-detector/wiki/Baseline)
- [TypeScript API](https://github.com/xue-moe/i18n-smell-detector/wiki/TypeScript-API)
- [Integrations](https://github.com/xue-moe/i18n-smell-detector/wiki/Integrations)
- [Performance](https://github.com/xue-moe/i18n-smell-detector/wiki/Performance)
- [Troubleshooting](https://github.com/xue-moe/i18n-smell-detector/wiki/Troubleshooting)

## Development

```bash
npm install
npm run typecheck
npm test
npm run check
npm run benchmark
```

## License

MIT
