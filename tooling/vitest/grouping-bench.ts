import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: {
      "@vueye-table/core": fileURLToPath(
        new URL("../../packages/core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    benchmark: {
      include: ["tests/bench/grouping.bench.ts"],
      outputJson: "test-results/grouping-bench.json",
    },
  },
});
