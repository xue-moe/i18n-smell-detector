# i18n-smell-detector

[![npm version](https://img.shields.io/npm/v/i18n-smell-detector.svg)](https://www.npmjs.com/package/i18n-smell-detector)
[![CI](https://github.com/xue-moe/i18n-smell-detector/actions/workflows/ci.yml/badge.svg)](https://github.com/xue-moe/i18n-smell-detector/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Find locale values copied from the base locale.

`i18n-smell-detector` checks localization files for keys whose translated value is identical to the base locale. This can help catch entries that were copied as placeholders and never translated.

## Features

- Detect values that are identical to the base locale
- Ignore expected matches by key or value
- Classify findings as `high`, `medium`, `low`, or `ignored`
- Output results as console text, JSON, or Markdown
- Fail CI based on a configurable severity level

## Install

```bash
npm install -D i18n-smell-detector
```

## Usage

Run the check:

```bash
npx i18n-smell-detector check-identical --config i18n-smell.config.mjs
```

Output formats:

```bash
npx i18n-smell-detector check-identical --format console
npx i18n-smell-detector check-identical --format json
npx i18n-smell-detector check-identical --format markdown
```

## CI usage

Use `--fail-on` to choose the lowest severity that should make the command exit with code `1`.

```bash
npx i18n-smell-detector check-identical --config i18n-smell.config.mjs --fail-on high
```

For a new project, it is often easier to start in reporting mode while tuning allowlists:

```bash
npx i18n-smell-detector check-identical --config i18n-smell.config.mjs --fail-on none
```

## Configuration

Create `i18n-smell.config.mjs`:

```js
export default {
  baseLocale: 'en',
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json',
    ja: './src/locales/ja.json'
  },

  allowIdenticalKeys: [
    'brand.*',
    'protocol.*',
    'common.ok',
    'common.id'
  ],

  allowIdenticalValues: [
    'OK',
    'ID',
    'HTTP',
    'API',
    'GET',
    'POST'
  ],

  ignoreSameLanguageFamily: true,
  trimWhitespace: true,
  ignoreCase: false,
  includeIgnored: false,
  failOn: 'high'
};
```

### Configuration reference

| Option | Type | Default | Description |
|---|---|---:|---|
| `baseLocale` | `string` | `'en'` | Locale used as the comparison source. It must also be listed in `locales`. |
| `locales` | `Record<string, string>` | `{}` | Map of locale codes to JSON locale file paths. Relative paths are resolved from the config file directory. |
| `allowIdenticalKeys` | `string[]` | `[]` | Key patterns that are allowed to match the base locale. Supports `*` wildcards, for example `brand.*`. |
| `allowIdenticalValues` | `string[]` | `[]` | Exact values that are allowed to match the base locale, for example `OK`, `API`, or `GET`. |
| `failOn` | `'high' \| 'medium' \| 'low' \| 'none'` | `'high'` | Lowest severity that makes the CLI exit with code `1`. Use `none` to report without failing. |
| `trimWhitespace` | `boolean` | `true` | Trim leading and trailing whitespace before comparing values. |
| `ignoreCase` | `boolean` | `false` | Compare values case-insensitively when set to `true`. |
| `ignoreSameLanguageFamily` | `boolean` | `true` | Ignore regional variants that share the same language family, such as `en` and `en-GB`. Set to `false` to check regional variants too. |
| `includeIgnored` | `boolean` | `false` | Include ignored findings in reports. Can also be enabled with `--include-ignored`. |

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

`--format json` prints an object with an `issues` array:

```json
{
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

| Field | Type | Description |
|---|---|---|
| `key` | `string` | Flattened locale key, such as `settings.profile.title`. |
| `baseLocale` | `string` | Locale being compared from. |
| `targetLocale` | `string` | Locale being checked. |
| `value` | `string` | Identical target value. |
| `severity` | `'high' \| 'medium' \| 'low' \| 'ignored'` | Classification assigned by the detection rules. |
| `reason` | `string` | Short explanation for the classification. |

Ignored issues are omitted by default. Pass `--include-ignored` to include them in JSON, console, or Markdown output.

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
| URL, path, color, or code-like value | ignored |
| Placeholder-only value, such as `{count}` | ignored |
| Short common label | low |
| Single English word | medium |
| English phrase | high |

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
    'protocol.*'
  ],
  allowIdenticalValues: [
    'OK',
    'ID',
    'API',
    'HTTPS'
  ],
  failOn: 'high'
};
```

Useful tuning patterns:

- Use `allowIdenticalKeys` for groups of expected identical values, such as names, legal labels, and protocol keys.
- Use `allowIdenticalValues` for exact shared labels, acronyms, method names, and technical terms.
- Set `ignoreSameLanguageFamily: false` if you want to check regional variants such as `en-GB`, `en-AU`, or `pt-BR`.
- Set `failOn: 'none'` while tuning a new project, then raise it to `high` or `medium` once the allowlist is stable.
- Pass `--include-ignored` when reviewing why a value was ignored.

## Notes

- This is not a coverage checker. It only reports keys that exist in both files and have identical values.
- The rules are conservative. Tune `allowIdenticalKeys` and `allowIdenticalValues` before making this a required CI step.
- Only string values are checked. Non-string locale values are ignored.

## Development

```bash
npm install
npm test
npm run check
```

## License

MIT