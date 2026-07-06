# i18n-smell-detector

`i18n-smell-detector` identifies potential "stale" translations in your localization files. It flags keys where the translated value is identical to the base locale, which often indicates that a string was never actually translated.

## Features

- Smart Detection: Categorizes identical translations based on length and content (words vs. phrases).

- Flexible Whitelisting: Exclude brand names, protocol codes, or common UI labels via configuration.

- CI Integration: Configurable failure thresholds (`fail-on`) for build pipelines.

- Multiple Output Formats: Supports console, JSON, and Markdown.


## Install

```bash
npm install -D i18n-smell-detector
```

For local development:

```bash
npm install
npm test
npm run check
```

## Usage

Run the check:

```bash
npx i18n-smell-detector check-identical --config i18n-smell.config.mjs
```

Output Options:

```bash
# Default output is console
npx i18n-smell-detector check-identical --format console
npx i18n-smell-detector check-identical --format json
npx i18n-smell-detector check-identical --format markdown
```

### CI/CD Integration

Set the severity level that causes the process to exit with an error:

```bash
npx i18n-smell-detector check-identical --fail-on high
npx i18n-smell-detector check-identical --fail-on medium
npx i18n-smell-detector check-identical --fail-on none
```

## Configuration(`i18n-smell.config.mjs`)

```js
export default {
  baseLocale: 'en',
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json',
    ja: './src/locales/ja.json',
    ko: './src/locales/ko.json',
    fr: './src/locales/fr.json',
    // ...
  },

  // Whitelist specific keys
  allowIdenticalKeys: [
    'brand.*',
    'protocol.*',
    'common.ok',
    'common.id'
  ],
  
  // Whitelist specific values
  allowIdenticalValues: [
    'OK',
    'ID',
    'HTTP',
    'API',
    'GET',
    'POST'
  ],

  ignoreSameLanguageFamily: true, // Ignore en -> en-GB
  trimWhitespace: true, // Trim and compare
  failOn: 'high'
};
```

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

## Detection Rules

| Case | Level |
|---|---|
| Key matches `allowIdenticalKeys` | ignored |
| Value matches `allowIdenticalValues` | ignored |
| Same language family (e.g., en, en-GB) | ignored |
| URLs, path, color, or code-like value | ignored |
| Placeholder-only value (e.g., `{count}`) | ignored |
| Short common label | low |
| Single English word | medium |
| English phrase | high |

## Notes

- ***Not a coverage checker***: This tool only reports keys that exist in both files but have identical values; it does not check for missing keys.

- ***Conservative by design***: The rules are conservative. Tune `allowIdenticalKeys` and `allowIdenticalValues` before making this a mandatory step in your CI pipeline.