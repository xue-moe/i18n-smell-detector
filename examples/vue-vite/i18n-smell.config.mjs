export default {
  baseLocale: 'en',
  locales: {
    en: './src/locales/en.json',
    zh: './src/locales/zh.json',
    ja: './src/locales/ja.json',
    'en-GB': './src/locales/en-GB.json'
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
  failOn: 'high'
};
