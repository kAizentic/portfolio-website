import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for the diagnostic spatial template suite.
 *
 * Tests run against `next dev` on port 3210 so they don't collide with a
 * developer's running 3000. The dev server is started once and shared
 * across all tests. Reduced-motion media is set per-test where needed.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // shared server, deterministic test order
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3210",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- -p 3210",
    url: "http://localhost:3210",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
