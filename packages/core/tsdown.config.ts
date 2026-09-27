import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  minify: false,
  platform: "neutral",
  sourcemap: true,
});
