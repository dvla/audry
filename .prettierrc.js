module.exports = {
  singleQuote: true,
  trailingComma: "es5",
  arrowParens: "always",
  tabWidth: 2,
  useTabs: false,
  printWidth: 120,
  semi: false,
  importOrder: ["<THIRD_PARTY_MODULES>", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: [
    "@trivago/prettier-plugin-sort-imports"
  ],
  overrides: [
    {
      files: ["*.yml"],
      options: {
        parser: "yaml",
      },
    },
  ],
};
