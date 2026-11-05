import { defineConfig } from "@playwright/test";

import base from "./playwright.config.mjs";

export default defineConfig({
  ...base,
  testMatch: "**/accessibility.audit.mjs",
  timeout: 120_000,
  outputDir: "test-results/a11y",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/a11y" }],
    ["json", { outputFile: "test-results/a11y/results.json" }],
  ],
});
