import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Keep lint focused on *source*, not generated platform artifacts.
  // eslint-config-next ignores some outputs by default; we extend that list.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Netlify build output (can contain huge generated bundles)
    ".netlify/**",

    // Playwright/Vitest output
    "playwright-report/**",
    "test-results/**",
    "coverage/**",

    // Misc build caches
    ".turbo/**",
    ".cache/**",
  ]),

  // Lint quality-gate policy:
  // - keep Next.js core rules intact
  // - keep hook correctness rules as errors
  // - downgrade a few "style"/migration rules to warnings so we can
  //   pay them down incrementally without blocking production deploys.
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'warn',
      // These React Compiler-related rules are useful, but currently too
      // disruptive for a production-readiness hard gate.
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
]);

export default eslintConfig;
