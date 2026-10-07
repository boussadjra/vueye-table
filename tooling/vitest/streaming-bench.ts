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
      include: ["tests/bench/streaming.bench.ts"],
      outputJson: "test-results/streaming-bench.json",
    },
  },
});
