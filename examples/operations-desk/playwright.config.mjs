import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  globalTimeout: 600_000,
  use: {
    baseURL: "http://127.0.0.1:4312",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "node scripts/browser-server.mjs",
    url: "http://127.0.0.1:4312/api/health",
    timeout: 60_000,
    reuseExistingServer: false,
  },
});
