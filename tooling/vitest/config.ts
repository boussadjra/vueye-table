import { fileURLToPath } from "node:url";

import { defineConfig, type ViteUserConfig } from "vitest/config";

const packageEntry = (name: string): string =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

/**
 * Source-level aliases.
 *
 * Tests exercise package sources rather than build output so a failing test points at the file
 * that owns the behavior.
 */
const alias = [
  { find: /^@vueye-table\/core$/u, replacement: packageEntry("core") },
  { find: /^@vueye-table\/headless$/u, replacement: packageEntry("headless") },
  { find: /^@vueye-table\/nuxt$/u, replacement: packageEntry("nuxt") },
  { find: /^@vueye-table\/styled$/u, replacement: packageEntry("styled") },
  { find: /^@vueye-table\/vue$/u, replacement: packageEntry("vue") },
  { find: /^vueye-table$/u, replacement: packageEntry("vueye-table") },
];

const shared = {
  clearMocks: true,
  restoreMocks: true,
  unstubEnvs: true,
  unstubGlobals: true,
} as const;

function project(
  name: string,
  directory: string,
  environment: "node" | "happy-dom",
): ViteUserConfig {
  return {
    resolve: { alias },
    test: {
      ...shared,
      name,
      environment,
      include: [`tests/${directory}/**/*.test.ts`],
    },
  };
}

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["packages/*/src/**/*.ts"],
      /** The Nuxt module only runs inside a real Nuxt build. */
      exclude: ["packages/nuxt/src/**"],
      /**
       * Thresholds sit just under what the suite achieves today, so a real regression fails while
       * ordinary refactoring does not. Raise them when coverage rises; never lower them to pass.
       */
      thresholds: {
        statements: 96,
        branches: 90,
        functions: 96,
        lines: 96,
        "packages/core/src/**": {
          statements: 97,
          branches: 93,
          functions: 97,
          lines: 97,
        },
      },
    },
    projects: [
      project("core", "core", "node"),
      project("vue", "vue", "happy-dom"),
      project("headless", "headless", "happy-dom"),
      project("styled", "styled", "happy-dom"),
      project("vueye-table", "vueye-table", "happy-dom"),
      project("repository", "repository", "node"),
    ],
  },
});
