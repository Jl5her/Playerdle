import { FlatCompat } from "@eslint/eslintrc"
import globals from "globals"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const compat = new FlatCompat({ baseDirectory: __dirname })
const compatConfigs = compat
  .extends("airbnb", "airbnb/hooks", "airbnb-typescript", "prettier")
  .map(config => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  }))

export default [
  {
    ignores: ["dist", "eslint.config.js"],
  },
  ...compatConfigs,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        project: "./tsconfig.app.json",
        tsconfigRootDir: __dirname,
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          project: "./tsconfig.app.json",
        },
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-no-bind": "off",
      "react/require-default-props": "off",
      "react/button-has-type": "off",
      "react/no-array-index-key": "off",
      "react/jsx-no-useless-fragment": "off",
      "react/self-closing-comp": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-shadow": "off",
      "no-restricted-syntax": "off",
      "no-plusplus": "off",
      "no-bitwise": "off",
      "default-case": "off",
      "no-nested-ternary": "off",
      "object-shorthand": "off",
      "consistent-return": "off",
      "import/extensions": "off",
      "import/no-cycle": "off",
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: ["**/*.config.{js,ts}", "vite.config.ts", "scripts/**/*.{ts,tsx}"],
        },
      ],
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
    },
  },
  {
    files: ["scripts/**/*.{ts,tsx}", "vite.config.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.scripts.json", "./tsconfig.node.json"],
        tsconfigRootDir: __dirname,
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: ["./tsconfig.scripts.json", "./tsconfig.node.json"],
        },
      },
    },
  },
  {
    files: ["scripts/**/*.{ts,tsx}"],
    rules: {
      "no-console": "off",
      "no-continue": "off",
      "no-await-in-loop": "off",
      "prefer-destructuring": "off",
      "no-promise-executor-return": "off",
      "no-underscore-dangle": "off",
      "@typescript-eslint/naming-convention": "off",
      "prefer-template": "off",
    },
  },
  {
    files: ["src/modals/game-over-modal.tsx"],
    rules: {
      "no-console": "off",
    },
  },
]
