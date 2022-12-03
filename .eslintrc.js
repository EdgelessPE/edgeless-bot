module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  overrides: [
    {
      files: [
        "src/**/*.ts",
        "templates/**/*.ts",
        "tasks/**/*.ts",
        "scripts/*.ts",
      ],
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  rules: {},
  ignorePatterns: ["*.js", "/dist", "/workshop", "/scripts/templates"],
};
