/** @type {import("prettier").Options} */
module.exports = {
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  singleQuote: true,
  importOrder: [
    '<BUILTIN_MODULES>',
    '',
    '<THIRD_PARTY_MODULES>',
    '',
    '^@/(.*)$',
    '^[./]',
    '',
    '<TYPES>',
  ],
  importOrderTypeScriptVersion: '5.0.0',
};
