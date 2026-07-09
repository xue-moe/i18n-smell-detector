# i18n-smell-detector Description

`i18n-smell-detector` is a CI-friendly CLI for finding localization quality issues that ordinary key coverage checks do not catch.

It currently provides three core checks:

- `check-identical`: finds target locale values copied from the base locale.
- `check-hardcoded`: finds hardcoded user-visible strings in Vue, JS, TS, JSX, and TSX source files.
- `check-placeholders`: finds missing or extra placeholders in target locale values.

The combined `check` command can run all enabled checks, write reports, use a baseline for gradual adoption, and emit console, JSON, Markdown, or SARIF output.

## Commands

### `check`

Runs all enabled checks.

```bash
i18n-smell-detector check --config i18n-smell.config.mjs
```

Enabled checks are controlled by:

```js
export default {
  checks: {
    identical: true,
    hardcoded: true,
    placeholders: true
  }
};
```

### `check-identical`

Runs only identical translation detection.

```bash
i18n-smell-detector check-identical --config i18n-smell.config.mjs
```

### `check-hardcoded`

Runs only hardcoded string detection.

```bash
i18n-smell-detector check-hardcoded --config i18n-smell.config.mjs
```

### `check-placeholders`

Runs only placeholder mismatch detection.

```bash
i18n-smell-detector check-placeholders --config i18n-smell.config.mjs
```

## CLI Options

| Option | Description |
|---|---|
| `-c, --config <path>` | Config file path. |
| `--format <format>` | Output format: `console`, `json`, `markdown`, or `sarif`. |
| `--fail-on <level>` | Lowest severity that exits with code `1`: `high`, `medium`, `low`, or `none`. |
| `--include-ignored` | Include ignored findings in output. |
| `--output <path>` | Write the full report to a file and print a short summary to stdout. |
| `--baseline <path>` | Read a baseline file and suppress known findings. |
| `--update-baseline` | Write the current visible findings to the baseline file. |
| `-h, --help` | Show help. |

## Configuration

The config file can be `.mjs`, `.js`, `.cjs`, or `.json`.

Default lookup order:

```txt
i18n-smell.config.mjs
i18n-smell.config.cjs
i18n-smell.config.js
i18n-smell.config.json
```

Example:

```js
export default {
  baseLocale: 'en',

  checks: {
    identical: true,
    hardcoded: true,
    placeholders: true
  },

  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json'
  },

  source: [
    'src/**/*.{vue,js,jsx,ts,tsx}'
  ],

  allowIdenticalKeys: [
    'brand.*',
    /^legal\./
  ],

  allowIdenticalValues: [
    'OK',
    /^HTTP\/\d(\.\d)?$/
  ],

  placeholderPatterns: [
    '\\{\\{[^}]+\\}\\}',
    '(?<!\\{)\\{[^{}]+\\}(?!\\})',
    '%[sdif]',
    '%\\([^)]+\\)[sdif]',
    '\\$\\d+'
  ],

  ignoreCodeLike: true,
  ignoreSameLanguageFamily: true,
  trimWhitespace: true,
  ignoreCase: false,

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
      'OK'
    ],
    ignorePatterns: [
      '^v\\d+$'
    ]
  },

  includeIgnored: false,
  format: 'console',
  output: 'reports/i18n-report.md',
  baseline: '.i18n-smell-baseline.json',
  failOn: 'high'
};
```

## Configuration Reference

| Option | Type | Default | Used by | Description |
|---|---|---|---|---|
| `baseLocale` | `string` | `'en'` | locale checks | Locale used as the source locale. |
| `locales` | `Record<string, string>` | `{}` | locale checks | Locale code to JSON file path map. Paths are resolved from the config file directory. |
| `checks.identical` | `boolean` | `true` | `check` | Enables or disables identical translation checking in the combined command. |
| `checks.hardcoded` | `boolean` | `true` | `check` | Enables or disables hardcoded string checking in the combined command. |
| `checks.placeholders` | `boolean` | `true` | `check` | Enables or disables placeholder mismatch checking in the combined command. |
| `source` | `string[]` | `['src/**/*.{vue,js,jsx,ts,tsx}']` | `check-hardcoded` | Source globs for hardcoded scanning. `node_modules` and `hardcoded.ignoreFiles` are ignored. |
| `allowIdenticalKeys` | `(string \| RegExp)[]` | `[]` | `check-identical` | Key allowlist. String entries support `*` wildcards; `RegExp` entries are tested against the flattened key. |
| `allowIdenticalValues` | `(string \| RegExp)[]` | `[]` | `check-identical` | Value allowlist. String entries are exact matches; `RegExp` entries are tested against the full value. |
| `placeholderPatterns` | `(string \| RegExp)[]` | common brace, printf, named printf, and `$1` patterns | locale checks | Placeholder-only values are ignored by `check-identical`; placeholder sets are compared by `check-placeholders`. |
| `ignoreCodeLike` | `boolean` | `true` | `check-identical` | Ignores paths, colors, acronyms, identifiers, and similar code-like values. |
| `ignoreSameLanguageFamily` | `boolean` | `true` | `check-identical` | Ignores regional variants that share the same language family, such as `en` and `en-GB`. |
| `trimWhitespace` | `boolean` | `true` | `check-identical` | Trims values before comparing. |
| `ignoreCase` | `boolean` | `false` | `check-identical` | Compares values case-insensitively. |
| `hardcoded.vueAttributes` | `string[]` | `placeholder`, `title`, `alt`, `aria-label`, `aria-description` | `check-hardcoded` | Static Vue attributes scanned for user-visible text. |
| `hardcoded.jsxAttributes` | `string[]` | `placeholder`, `title`, `alt`, `aria-label`, `aria-description` | `check-hardcoded` | Static JSX/TSX attributes scanned for user-visible text. |
| `hardcoded.functions` | `string[]` | `alert`, `confirm`, `toast.success`, `toast.error` | `check-hardcoded` | JS/TS call expressions whose static string arguments are scanned. |
| `hardcoded.ignoreFiles` | `string[]` | `[]` | `check-hardcoded` | Glob patterns excluded from hardcoded scanning. |
| `hardcoded.ignoreValues` | `(string \| RegExp)[]` | `[]` | `check-hardcoded` | Exact values or regular expressions to ignore. |
| `hardcoded.ignorePatterns` | `(string \| RegExp)[]` | `[]` | `check-hardcoded` | Regular expression patterns to ignore. String entries are compiled as regular expressions. |
| `includeIgnored` | `boolean` | `false` | reporters | Includes ignored findings in reports. |
| `format` | `'console' \| 'json' \| 'markdown' \| 'sarif'` | `'console'` | reporters | Default output format. CLI `--format` takes precedence. |
| `output` | `string` | unset | reporters | Report file path. CLI `--output` takes precedence. |
| `baseline` | `string` | unset | baseline | Baseline file path. CLI `--baseline` takes precedence. |
| `failOn` | `'high' \| 'medium' \| 'low' \| 'none'` | `'high'` | CLI exit code | Lowest visible severity that exits with code `1`. |

## Check Behavior

### `check-identical`

This check loads JSON locale files, flattens nested keys, and compares each target locale against `baseLocale`.

Ignored by default or by config:

- Keys matching `allowIdenticalKeys`.
- Values matching `allowIdenticalValues`.
- Same language family targets when `ignoreSameLanguageFamily` is enabled.
- Blank values.
- External references such as URLs, email addresses, and telephone links.
- Placeholder-only values such as `{count}` or `{{ count }}`.
- Code-like values when `ignoreCodeLike` is enabled.

### `check-placeholders`

This check compares placeholder sets between the base locale and each target locale.

Example:

```json
{
  "en": {
    "user.greeting": "Hello {name}"
  },
  "zh": {
    "user.greeting": "你好"
  }
}
```

This reports a high-severity `missing placeholder` issue with `missing: ["{name}"]`.

Supported by default:

- `{name}`
- `{{ name }}`
- `%s`, `%d`, `%i`, `%f`
- `%(name)s`
- `$1`

### `check-hardcoded`

This check scans configured source files.

It detects:

- Vue template text, such as `<button>Save</button>`.
- Static Vue attributes, such as `placeholder`, `title`, `alt`, `aria-label`, and `aria-description`.
- JSX/TSX text, such as `<button>Save</button>`.
- Static JSX/TSX attributes configured by `hardcoded.jsxAttributes`.
- Static string arguments passed to configured JS/TS functions, such as `toast.success('Saved')`.

It ignores:

- Whitespace-only text nodes.
- Dynamic Vue bindings such as `:placeholder="label"`.
- Runtime JSX expressions and variable references.
- Mustache-only values such as `{{ label }}`.
- Numbers, punctuation, symbols, CSS-like values, paths, URLs, hex colors, and short all-caps codes.
- Values matching `hardcoded.ignoreValues` or `hardcoded.ignorePatterns`.

## Reports

Supported formats:

- `console`
- `json`
- `markdown`
- `sarif`

JSON output includes a `summary` and an `issues` array. Combined JSON output groups summary counts by check and adds a `check` field to each issue. Issues include stable `id` fields.

Markdown output for `check` includes:

- A top-level report title.
- A summary table grouped by check.
- One section per enabled check.

SARIF output is SARIF 2.1.0 and includes:

- Tool metadata.
- Rule metadata grouped by check and reason.
- Source locations for file-based hardcoded findings.
- Stable issue ids in `partialFingerprints.stableId`.

## Baseline

Baseline support lets existing projects adopt the tool gradually.

Create or update a baseline:

```bash
i18n-smell-detector check --baseline .i18n-smell-baseline.json --update-baseline
```

Use a baseline:

```bash
i18n-smell-detector check --baseline .i18n-smell-baseline.json
```

Baseline file shape:

```json
{
  "version": 1,
  "issues": [
    {
      "id": "identical:zh:home.title",
      "key": "home.title",
      "targetLocale": "zh",
      "value": "Welcome back"
    },
    {
      "id": "placeholders:zh:user.greeting",
      "key": "user.greeting",
      "targetLocale": "zh",
      "value": "你好"
    },
    {
      "id": "hardcoded:src/components/UserPanel.vue:3:9:Account settings",
      "file": "src/components/UserPanel.vue",
      "line": 3,
      "column": 9,
      "value": "Account settings"
    }
  ]
}
```

Behavior:

- Issues present in the baseline are marked as `ignored` with reason `baseline`.
- Ignored baseline issues are hidden unless `--include-ignored` is used.
- New issues not present in the baseline are still reported and can fail CI.
- Updating the baseline writes the current non-ignored findings.

## Exit Codes

| Code | Meaning |
|---:|---|
| `0` | The command completed and no visible issue reached `failOn`. |
| `1` | The command completed and at least one visible issue reached `failOn`. |
| `2` | Runtime or configuration error. |

## Examples

The repository includes:

- `examples/vue-vite`: a richer example with copied locale values and hardcoded Vue template strings.
- `examples/basic`: a smaller neutral example for local smoke testing.

Useful scripts:

```bash
npm run check
npm run check:identical
npm run check:hardcoded
npm run example:basic
```

## Current Limitations

- The tool scans static strings only; it does not evaluate runtime expressions or follow variables.
- JS/TS scanning only checks configured function calls.
- Classification uses heuristic rules instead of full language detection.
- The tool does not check missing keys or unused keys.
- The tool does not automatically fix or translate strings.
- Hardcoded issue ids include current locations and values, so moving hardcoded strings can change their identifiers.

## Implementation Map

Important source modules:

| Path | Purpose |
|---|---|
| `src/cli.js` | CLI argument parsing, config loading, output files, baseline flow, exit codes. |
| `src/run-checks.js` | Runs enabled checks and attaches check metadata. |
| `src/check-identical.js` | Identical translation check. |
| `src/check-placeholders.js` | Placeholder extraction and mismatch check. |
| `src/check-hardcoded.js` | Hardcoded string check over configured source files. |
| `src/source/scan-vue-sfc.js` | Reads and parses Vue SFC files. |
| `src/source/scan-vue-template.js` | Walks Vue template AST text nodes and attributes. |
| `src/source/scan-js-source.js` | Parses JS/TS/JSX/TSX and scans configured static strings. |
| `src/rules/classify-identical.js` | Identical translation classification. |
| `src/rules/classify-hardcoded.js` | Hardcoded string classification. |
| `src/baseline.js` | Baseline IDs, loading, applying, and writing. |
| `src/reporters/console.js` | Console report rendering. |
| `src/reporters/json.js` | Single-check JSON rendering. |
| `src/reporters/markdown.js` | Single-check Markdown rendering. |
| `src/reporters/sarif.js` | SARIF rendering. |
| `src/reporters/combined.js` | Combined `check` rendering. |
