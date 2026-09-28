import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: [/^@nuxt\//u, "vueye-table", "vue"],
  },
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: false,
  platform: "neutral",
  sourcemap: true,
});
