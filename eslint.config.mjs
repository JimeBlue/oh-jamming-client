import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored from the Animate UI registry, not written here. It trips the
    // React 19 rules this config turns on (setState in an effect, refs read
    // during render, motion.create inside a component) and it works anyway —
    // and any fix would be undone the next time an icon is added, because the
    // registry rewrites these files wholesale. Ours is the code that calls it.
    "src/components/animate-ui/**",
  ]),
]);

export default eslintConfig;
