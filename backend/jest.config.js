module.exports = {
  rootDir: __dirname,
  globalSetup: "<rootDir>/tests/setup/global-setup.js",
  globalTeardown: "<rootDir>/tests/setup/global-teardown.js",
  testTimeout: 30000,
  clearMocks: true,
  verbose: true,
  // All integration/regression test files share one MongoMemoryServer instance
  // (started once in globalSetup for speed) and each file's afterEach clears
  // every collection. Running files in parallel workers lets one file's
  // cleanup wipe another file's in-flight fixtures — force one file at a time.
  maxWorkers: 1,
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      rootDir: __dirname,
      testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"]
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      rootDir: __dirname,
      testMatch: ["<rootDir>/tests/integration/**/*.test.js"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/db.setup.js"]
    },
    {
      displayName: "regression",
      testEnvironment: "node",
      rootDir: __dirname,
      testMatch: ["<rootDir>/tests/regression/**/*.test.js"],
      setupFilesAfterEnv: ["<rootDir>/tests/setup/db.setup.js"]
    }
  ]
};
