import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "@angular-eslint/eslint-plugin";
import angularParser from "@angular-eslint/template-parser";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.turbo/**", "**/build/**"],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
    plugins: {
      "@angular-eslint": angular,
    },
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: ["v", "app"],
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: ["v", "app"],
          style: "kebab-case",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.html"],
    plugins: {
      "@angular-eslint/template": angularParser,
    },
    languageOptions: {
      parser: angularParser,
    },
    rules: {
      // Add template specific rules here
    },
  }
);
