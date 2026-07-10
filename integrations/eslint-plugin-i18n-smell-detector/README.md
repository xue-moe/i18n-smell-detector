# eslint-plugin-i18n-smell-detector

Experimental TypeScript ESLint integration for editor and pull-request feedback.

This is intentionally small. The CLI remains the source of truth for full reports, baselines, and SARIF output.

Build it first:

```bash
npm install
npm run build
```

Example flat config:

```js
import i18nSmell from './integrations/eslint-plugin-i18n-smell-detector/dist/index.js';

export default [
  {
    plugins: {
      'i18n-smell-detector': i18nSmell,
    },
    rules: {
      'i18n-smell-detector/no-static-jsx-text': 'warn',
    },
  },
];
```
