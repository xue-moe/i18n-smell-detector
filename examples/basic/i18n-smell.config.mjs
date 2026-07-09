export default {
  baseLocale: 'en',
  checks: {
    identical: true,
    hardcoded: true,
    placeholders: true
  },
  source: [
    './src/**/*.{vue,js,jsx,ts,tsx}'
  ],
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json'
  },
  allowIdenticalKeys: [
    'brand.*'
  ],
  allowIdenticalValues: [
    'OK'
  ],
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
    ignoreValues: [
      'OK'
    ]
  }
};
