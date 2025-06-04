module.exports = {
  singleQuote: true,
  trailingComma: "es5",
  arrowParens: "always",
  tabWidth: 2,
  useTabs: false,
  printWidth: 120,
  semi: false,
  overrides: [
    {
      files: ["*.yml"],
      options: {
        parser: "yaml",
      },
    },
  ],
};
