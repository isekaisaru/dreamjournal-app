import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", // Only look for tests in the e2e directory
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 300_000, // Turbopack の初回コンパイルに最大5分を許容
    stdout: "ignore",
    stderr: "pipe",
  },
});
