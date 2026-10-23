import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/results.json" }]
  ],
  // Generous: tests run against `next dev`, which JIT-compiles each route on
  // its first hit. A journey visiting 6+ distinct dashboard routes can pay
  // that compile cost repeatedly on a cold run — this is dev-server latency,
  // not app or test flakiness (a production build wouldn't have it).
  timeout: 90_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    }
  ],
  webServer: [
    {
      command: "npm run server:dev",
      url: "http://localhost:5000/health",
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: ".",
      // authLimiter is IP-scoped and shared across login/signup/refresh (see
      // otp-rate-limit.middleware.js). The suite runs serially (workers: 1)
      // against real endpoints -- signup-validation and multi-role auth
      // coverage alone can approach the 30-req/15min production default. This
      // override only applies to the backend process Playwright spawns; the
      // production default (30) is untouched everywhere else.
      //
      // API_RATE_LIMIT raises the global /api limiter (app.js) the same way:
      // a full-suite run (~360 tests, each loading dashboard pages that fan
      // out 5-15 API calls) far exceeds the 400-req/15min per-IP production
      // ceiling, which is sized for one human, not a serial E2E suite.
      //
      // UPLOAD_RATE_LIMIT raises the per-IP upload limiter
      // (upload-rate-limit.middleware.js, default 30/15min): the resume-parser
      // regression spec alone performs ~15 uploads per run, so two suite runs
      // (or one run plus retries) inside a window 429s every upload after it.
      env: { AUTH_RATE_LIMIT: "300", API_RATE_LIMIT: "20000", UPLOAD_RATE_LIMIT: "500" }
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: "."
    }
  ]
});
