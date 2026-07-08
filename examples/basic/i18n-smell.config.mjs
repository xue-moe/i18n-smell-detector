export default {
  baseLocale: 'en',
  source: [
    './src/**/*.vue'
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
    ignoreValues: [
      'OK'
    ]
  }
};
