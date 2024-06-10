module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [
        ".eslintrc.{js,cjs}",
        "src/**/*.ts",
        "templates/**/*.ts",
        "tasks/**/*.ts",
        "scripts/*.ts",
      ],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "prettier/prettier": "error",
    "spaced-comment": "error",
    "@typescript-eslint/no-explicit-any":"off"
  },
  ignorePatterns: ["*.js", "/dist", "/workshop", "/scripts/templates"],
};
