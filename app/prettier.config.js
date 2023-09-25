/** @type {import("prettier").Options} */
module.exports = {
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  singleQuote: true,
  // importOrder: ['^@/(.*)$', '^[./]'],
  // importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};
