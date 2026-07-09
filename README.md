# i18n-smell-detector

[![npm version](https://img.shields.io/npm/v/i18n-smell-detector.svg)](https://www.npmjs.com/package/i18n-smell-detector)
[![CI](https://github.com/xue-moe/i18n-smell-detector/actions/workflows/ci.yml/badge.svg)](https://github.com/xue-moe/i18n-smell-detector/actions/workflows/ci.yml)
[![Socket Badge](https://badge.socket.dev/npm/package/i18n-smell-detector)](https://badge.socket.dev/npm/package/i18n-smell-detector)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Find localization issues that key coverage checks miss.

`i18n-smell-detector` checks localization files for copied base-locale values and placeholder mismatches. It can also scan Vue, JavaScript, TypeScript, JSX, and TSX source for hardcoded user-visible strings.

Current scope: text classification is rule-based and conservative, so projects with many proper nouns, product codes, or non-English copy should start with `--fail-on none` and tune allowlists before enforcing CI.

## Features

- Detect values that are identical to the base locale
- Detect missing or extra placeholders across locale values
- Detect hardcoded strings in Vue templates, JSX/TSX text and attributes, and configured JS/TS function calls
- Ignore expected matches by key or value
- Classify findings as `high`, `medium`, `low`, or `ignored`
- Output results as console text, JSON, Markdown, or SARIF
- Fail CI based on a configurable severity level

## Install

```bash
npm install -D i18n-smell-detector
```

## Quick Start

Installing the package only adds the CLI. Generate a starter config in your project root:

```bash
npx i18n-smell-detector init
```

This creates `i18n-smell.config.mjs`:

```js
export default {
  baseLocale: 'en',
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json'
  },
  source: [
    'src/**/*.{vue,js,jsx,ts,tsx}'
  ]
};
```

Adjust `locales` and `source` to match your project, then run:

```bash
npx i18n-smell-detector check --config i18n-smell.config.mjs --fail-on none
```

If your config file lives somewhere else, pass that path:

```bash
npx i18n-smell-detector init --config ./config/i18n-smell.config.mjs
npx i18n-smell-detector check --config ./config/i18n-smell.config.mjs
```

`init` refuses to overwrite an existing config. Use `--force` only when you intentionally want to replace it. Locale and source paths inside the config are resolved relative to the config file.

## Usage

Run the check:

```bash
npx i18n-smell-detector init
npx i18n-smell-detector check --config i18n-smell.config.mjs
npx i18n-smell-detector check-identical --config i18n-smell.config.mjs
npx i18n-smell-detector check-hardcoded --config i18n-smell.config.mjs
npx i18n-smell-detector check-placeholders --config i18n-smell.config.mjs
```

Output formats:

```bash
npx i18n-smell-detector check-identical --format console
npx i18n-smell-detector check-identical --format json
npx i18n-smell-detector check-identical --format markdown
npx i18n-smell-detector check-hardcoded --format json
npx i18n-smell-detector check --format markdown --output i18n-report.md
npx i18n-smell-detector check --format sarif --output i18n-smell.sarif
```

CLI options:

| Option | Description |
|---|---|
| `-c, --config <path>` | Use a specific config file. |
| `--format <format>` | Print `console`, `json`, `markdown`, or `sarif` output. |
| `--fail-on <level>` | Exit with code `1` for findings at `high`, `medium`, or `low`. Use `none` while tuning. |
| `--include-ignored` | Include ignored findings in the report. |
| `--output <path>` | Write the full report to a file and print a short summary. |
| `--baseline <path>` | Suppress findings stored in a baseline file. |
| `--update-baseline` | Write the current findings to the baseline file. |
| `-h, --help` | Show CLI help. |

## CI usage

Use `--fail-on` to choose the lowest severity that should make the command exit with code `1`.

```bash
npx i18n-smell-detector check --config i18n-smell.config.mjs --fail-on high
```

For a new project, it is often easier to start in reporting mode while tuning allowlists:

```bash
npx i18n-smell-detector check --config i18n-smell.config.mjs --fail-on none
```

### CI report artifact

Add a workflow such as `.github/workflows/i18n-smell.yml`:

```yaml
name: i18n smell check

on:
  pull_request:
  push:
    branches: [main]

jobs:
  i18n-smell:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 22

      - run: npm ci

      - name: Run i18n checks
        run: npx i18n-smell-detector check --config i18n-smell.config.mjs --fail-on high

      - name: Write Markdown report
        if: always()
        run: npx i18n-smell-detector check --config i18n-smell.config.mjs --format markdown --output reports/i18n-smell.md --fail-on none

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: i18n-smell-report
          path: reports/i18n-smell.md
```

## Configuration

Create `i18n-smell.config.mjs` and adjust `locales` and `source` to match your project:

```js
export default {
  baseLocale: 'en',
  checks: {
    identical: true,
    hardcoded: true,
    placeholders: true
  },
  source: [
    'src/**/*.{vue,js,jsx,ts,tsx}'
  ],

  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json',
    ja: './src/locales/ja.json'
  },

  allowIdenticalKeys: [
    'brand.*',
    /^protocol\./,
    'common.ok',
    'common.id'
  ],

  allowIdenticalValues: [
    'OK',
    'ID',
    /^HTTP\/\d(\.\d)?$/,
    'API',
    'GET',
    'POST'
  ],

  placeholderPatterns: [
    '\\{\\{[^}]+\\}\\}',
    '(?<!\\{)\\{[^{}]+\\}(?!\\})',
    '%[sdif]',
    '%\\([^)]+\\)[sdif]',
    '\\$\\d+'
  ],

  ignoreCodeLike: true,
  hardcoded: {
    vueAttributes: [
      'placeholder',
      'title',
      'alt',
      'aria-label',
      'aria-description'
    ],
    jsxAttributes: [
      'placeholder',
      'title',
      'alt',
      'aria-label',
      'aria-description'
    ],
    functions: [
      'toast.success',
      'toast.error',
      'alert',
      'confirm'
    ],
    ignoreFiles: [
      'src/generated/**'
    ],
    ignoreValues: [
      'OK',
      'ID'
    ],
    ignorePatterns: [
      '^v\\d+$'
    ]
  },
  ignoreSameLanguageFamily: true,
  trimWhitespace: true,
  ignoreCase: false,
  includeIgnored: false,
  format: 'console',
  baseline: '.i18n-smell-baseline.json',
  failOn: 'high'
};
```

### Configuration reference

| Option | Type | Default | Description |
|---|---|---:|---|
| `baseLocale` | `string` | `'en'` | Locale used as the comparison source. It must also be listed in `locales`. |
| `checks` | `{ identical?: boolean, hardcoded?: boolean, placeholders?: boolean }` | all enabled | Checks run by the combined `check` command. Existing single-check commands ignore this setting. |
| `source` | `string[]` | `['src/**/*.{vue,js,jsx,ts,tsx}']` | Source globs used by `check-hardcoded`. `node_modules` and `hardcoded.ignoreFiles` are ignored. |
| `locales` | `Record<string, string>` | `{}` | Map of locale codes to JSON locale file paths. Relative paths are resolved from the config file directory. |
| `allowIdenticalKeys` | `(string \| RegExp)[]` | `[]` | Key rules that are allowed to match the base locale. String rules support `*` wildcards, for example `brand.*`. `RegExp` rules are tested against the flattened key. |
| `allowIdenticalValues` | `(string \| RegExp)[]` | `[]` | Value rules that are allowed to match the base locale. String rules are exact matches, for example `OK`, `API`, or `GET`. `RegExp` rules are tested against the full value. |
| `placeholderPatterns` | `(string \| RegExp)[]` | common brace, printf, named printf, and `$1` patterns | Placeholder patterns used by `check-identical` placeholder-only ignores and `check-placeholders` mismatch detection. String entries must be valid regular expression sources. |
| `ignoreCodeLike` | `boolean` | `true` | Ignore built-in code-like values such as paths, colors, acronyms, and identifiers. Set to `false` to report them. |
| `hardcoded.vueAttributes` | `string[]` | `placeholder`, `title`, `alt`, `aria-label`, `aria-description` | Static Vue attributes checked by `check-hardcoded`. Dynamic bindings such as `:placeholder` are ignored. |
| `hardcoded.jsxAttributes` | `string[]` | `placeholder`, `title`, `alt`, `aria-label`, `aria-description` | Static JSX/TSX attributes checked by `check-hardcoded`. Expression attributes are ignored unless they contain a static string literal. |
| `hardcoded.functions` | `string[]` | `alert`, `confirm`, `toast.success`, `toast.error` | JS/TS call expressions whose static string arguments are checked by `check-hardcoded`. |
| `hardcoded.ignoreFiles` | `string[]` | `[]` | Glob patterns excluded from `check-hardcoded`, useful for generated files or vendored code. |
| `hardcoded.ignoreValues` | `(string \| RegExp)[]` | `[]` | Exact values or regular expressions ignored by `check-hardcoded`. |
| `hardcoded.ignorePatterns` | `(string \| RegExp)[]` | `[]` | Regular expression patterns ignored by `check-hardcoded`. String entries are compiled as regular expressions. |
| `failOn` | `'high' \| 'medium' \| 'low' \| 'none'` | `'high'` | Lowest severity that makes the CLI exit with code `1`. Use `none` to report without failing. |
| `trimWhitespace` | `boolean` | `true` | Trim leading and trailing whitespace before comparing values. |
| `ignoreCase` | `boolean` | `false` | Compare values case-insensitively when set to `true`. |
| `ignoreSameLanguageFamily` | `boolean` | `true` | Ignore regional variants that share the same language family, such as `en` and `en-GB`. Set to `false` to check regional variants too. |
| `includeIgnored` | `boolean` | `false` | Include ignored findings in reports. Can also be enabled with `--include-ignored`. |
| `format` | `'console' \| 'json' \| 'markdown' \| 'sarif'` | `'console'` | Default report format. CLI `--format` takes precedence. |
| `output` | `string` | unset | Report file path. CLI `--output` takes precedence. |
| `baseline` | `string` | unset | Baseline file path used by `--baseline` or `--update-baseline`. |

## Example output

```txt
i18n-smell-detector: identical translations
high=2 medium=1 low=0 ignored=16

HIGH zh.home.welcome
  value: "Welcome back"
  reason: copied English phrase

HIGH zh.settings.profile
  value: "Profile settings"
  reason: copied English phrase

MEDIUM ja.form.search
  value: "Search"
  reason: copied English word
```

## JSON output

`--format json` prints an object with a `summary` and an `issues` array:

```json
{
  "summary": {
    "high": 1,
    "medium": 0,
    "low": 0,
    "ignored": 16
  },
  "issues": [
    {
      "key": "home.welcome",
      "baseLocale": "en",
      "targetLocale": "zh",
      "value": "Welcome back",
      "severity": "high",
      "reason": "copied English phrase"
    }
  ]
}
```

Fields:

Summary counts include all findings, including ignored findings that may be omitted from the visible `issues` array.

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Flattened locale key, such as `settings.profile.title`. |
| `baseLocale` | `string` | Locale being compared from. |
| `targetLocale` | `string` | Locale being checked. |
| `value` | `string` | Identical target value. |
| `severity` | `'high' \| 'medium' \| 'low' \| 'ignored'` | Classification assigned by the detection rules. |
| `reason` | `string` | Short explanation for the classification. |
| `id` | `string` | Stable issue identifier used by JSON, SARIF, and baselines. |

Ignored issues are omitted by default. Pass `--include-ignored` to include them in JSON, console, or Markdown output.

## Placeholder output

`check-placeholders` reports target locale values whose placeholder set differs from the base locale:

```txt
i18n-smell-detector: placeholder mismatches
high=1 medium=0 low=0 ignored=0

HIGH zh.user.greeting
  value: "你好"
  missing: {name}
  reason: missing placeholder
```

JSON output includes `missing` and `extra` arrays:

```json
{
  "summary": {
    "high": 1,
    "medium": 0,
    "low": 0,
    "ignored": 0
  },
  "issues": [
    {
      "key": "user.greeting",
      "baseLocale": "en",
      "targetLocale": "zh",
      "value": "你好",
      "missing": ["{name}"],
      "extra": [],
      "severity": "high",
      "reason": "missing placeholder",
      "id": "placeholders:zh:user.greeting"
    }
  ]
}
```

## Hardcoded string output

`check-hardcoded` reports Vue template text, static Vue attributes, JSX/TSX text and attributes, and configured JS/TS function call strings:

```txt
i18n-smell-detector: hardcoded strings
high=1 medium=1 low=0 ignored=4

HIGH src/components/UserPanel.vue:12:15
  value: "Profile settings"
  reason: static template text

MEDIUM src/components/SearchInput.vue:8:23
  value: "Search"
  reason: static placeholder attribute
```

JSON output includes source locations:

```json
{
  "summary": {
    "high": 1,
    "medium": 1,
    "low": 0,
    "ignored": 4
  },
  "issues": [
    {
      "file": "src/components/UserPanel.vue",
      "line": 12,
      "column": 15,
      "value": "Profile settings",
      "severity": "high",
      "reason": "static template text",
      "kind": "vue-text",
      "id": "hardcoded:src/components/UserPanel.vue:12:15:Profile settings"
    }
  ]
}
```

## Running all checks

Use `check` to run every enabled check in one command:

```bash
npx i18n-smell-detector check --config i18n-smell.config.mjs
```

Disable checks during gradual rollout:

```js
export default {
  checks: {
    identical: true,
    hardcoded: false,
    placeholders: true
  }
};
```

Combined JSON output groups counts by check:

```json
{
  "summary": {
    "identical": {
      "high": 2,
      "medium": 1,
      "low": 0,
      "ignored": 16
    },
    "hardcoded": {
      "high": 3,
      "medium": 2,
      "low": 0,
      "ignored": 3
    },
    "placeholders": {
      "high": 1,
      "medium": 0,
      "low": 0,
      "ignored": 0
    }
  },
  "issues": []
}
```

## Writing reports

Use `--output` to write the full report to a file. The CLI prints a short summary to stdout after writing.

```bash
npx i18n-smell-detector check --format markdown --output reports/i18n-report.md
npx i18n-smell-detector check --format json --output reports/i18n-report.json
npx i18n-smell-detector check --format sarif --output reports/i18n-smell.sarif
```

Markdown output for `check` includes a summary table and one section per check, which makes it suitable for CI artifacts.

SARIF output uses stable issue ids as `partialFingerprints.stableId`, so it can be uploaded to code scanning tools that understand SARIF 2.1.0.

## Gradual adoption

Use a baseline to ignore existing findings while still failing CI for new ones:

```bash
npx i18n-smell-detector check --baseline .i18n-smell-baseline.json --update-baseline
npx i18n-smell-detector check --baseline .i18n-smell-baseline.json
```

The baseline stores stable issue identifiers. Updating it removes findings that no longer exist and records the current visible findings.

## Exit codes

| Code | Meaning |
|---:|---|
| `0` | Completed successfully and no visible issue reached the configured `failOn` threshold. |
| `1` | Completed successfully, but at least one visible issue reached the configured `failOn` threshold. |
| `2` | Runtime or configuration error, such as a missing config file, missing locale file, invalid JSON, or unsupported CLI option. |

## Detection rules

| Case | Level |
|---|---|
| Key matches `allowIdenticalKeys` | ignored |
| Value matches `allowIdenticalValues` | ignored |
| Same language family, such as `en` and `en-GB` | ignored |
| Placeholder-only value, such as `{count}` | ignored |
| URL, path, color, or code-like value | ignored by default |
| Short common label | low |
| Single English word | medium |
| English phrase | high |

For `check-hardcoded`, sentence-like template text and static attributes are `high`, single words are `medium`, short common labels are `low`, and configured or non-user-facing values are `ignored`.

## False positive tuning

Identical text is sometimes intentional. Start by running the detector in reporting mode, then allow known names, protocol terms, short labels, and other strings that should stay the same across languages.

```js
export default {
  baseLocale: 'en',
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json'
  },
  allowIdenticalKeys: [
    'brand.*',
    'legal.name',
    /^protocol\./
  ],
  allowIdenticalValues: [
    'OK',
    'ID',
    'API',
    /^HTTP\/\d(\.\d)?$/
  ],
  placeholderPatterns: [
    '\\{\\{[^}]+\\}\\}',
    '(?<!\\{)\\{[^{}]+\\}(?!\\})',
    '%[sdif]',
    '%\\([^)]+\\)[sdif]',
    '\\$\\d+'
  ],
  failOn: 'high'
};
```

Useful tuning patterns:

- Use `allowIdenticalKeys` for groups of expected identical values, such as names, legal labels, and protocol keys.
- Use string `allowIdenticalKeys` entries for exact or wildcard key matches, and `RegExp` entries for broader key families.
- Use string `allowIdenticalValues` entries for exact shared labels, and `RegExp` entries for structured values such as `HTTP/2`.
- Add `placeholderPatterns` for framework-specific placeholders such as `%s`, `%(name)s`, or `$1`. Mixed content such as `Total: {count}` is still reported.
- Set `ignoreCodeLike: false` if paths, colors, acronyms, or identifiers should be shown as findings.
- Set `ignoreSameLanguageFamily: false` if you want to check regional variants such as `en-GB`, `en-AU`, or `pt-BR`.
- Set `failOn: 'none'` while tuning a new project, then raise it to `high` or `medium` once the allowlist is stable.
- Pass `--include-ignored` when reviewing why a value was ignored.
- Use `source` to choose Vue, JS, TS, JSX, and TSX files for `check-hardcoded`.
- Tune `hardcoded.vueAttributes` if your project uses additional static attributes for user-visible text.
- Tune `hardcoded.jsxAttributes` if your React components use additional static attributes for user-visible text.
- Tune `hardcoded.functions` to check project-specific notification, modal, or validation helpers.
- Use `hardcoded.ignoreFiles` for generated source files.
- Use `hardcoded.ignoreValues` and `hardcoded.ignorePatterns` for intentional literals such as `OK`, version labels, or product codes.

## Limitations

`check-hardcoded` scans configured static strings in Vue, JS, TS, JSX, and TSX. It does not evaluate runtime expressions or follow variables. Classification uses heuristic rules rather than full language detection.

## Notes

- This is not a coverage checker. It only reports keys that exist in both files and have identical values.
- The rules are conservative. Tune `allowIdenticalKeys` and `allowIdenticalValues` before making this a required CI step.
- Only string values are checked. Non-string locale values are ignored.

## Development

```bash
npm install
npm test
npm run check
npm run example:basic
```

## License

MIT
