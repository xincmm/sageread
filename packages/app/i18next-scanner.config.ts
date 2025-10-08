export const options = {
  debug: false,
  sort: false,
  func: {
    list: ['_'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  lngs: [
    'de',
    'ja',
    'es',
    'fr',
    'it',
    'el',
    'ko',
    'uk',
    'nl',
    'pl',
    'pt',
    'ru',
    'tr',
    'hi',
    'id',
    'vi',
    'ar',
    'th',
    'zh-CN',
    'zh-TW',
  ],
  ns: ['translation'],
  defaultNs: 'translation',
  // ... 其他配置保持不变
} as const;

export default {
  input: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.test.{js,jsx,ts,tsx}'],
  output: '.',
  options,
}; 