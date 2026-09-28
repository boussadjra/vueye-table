import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: [/^@vueye-table\//u, "vue"],
  },
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: false,
  platform: "neutral",
  sourcemap: true,
  copy: [{ from: "src/style.css", to: "dist" }],
});
