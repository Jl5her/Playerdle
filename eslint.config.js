// Shared workspace ESLint config (flat config).
// Apps in `apps/*` can extend or override by adding their own eslint.config.js.

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.tmp/**",
      "**/coverage/**",
      "**/build/**",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
]
