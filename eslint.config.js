import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      "src/visualizers/**/*.tsx",
      "src/audience/AudienceView.tsx",
      "src/presenter/MiniScenePreview.tsx",
      "src/stage/**/*.tsx",
      "src/presentation/useShowBeat.ts",
    ],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
]);
