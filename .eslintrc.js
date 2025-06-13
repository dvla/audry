module.exports = {
  env: {
    browser: false,
    es2021: true
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
      },
      node: {
        extensions: [".js", ".ts"],
        moduleDirectory: ["node_modules", "src/"],
        paths: ["node_modules/", "src", "node_modules/@types", "."],
      },
    },
  },
  extends: [
    "plugin:prettier/recommended",
    "plugin:@vitest/legacy-recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.eslint.json",
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: ["@vitest", "import", "@typescript-eslint"],
  ignorePatterns: ["prettierrc.js"],
};
