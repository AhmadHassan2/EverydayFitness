import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Auth and demo-mode switches intentionally do a full page load so no
    // preserved route state or cached data from one session leaks into another.
    files: ["src/lib/session.ts", "src/components/auth/**", "src/components/shell/app-shell.tsx"],
    rules: { "@next/next/no-location-assign-relative-destination": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
