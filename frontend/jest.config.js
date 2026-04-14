const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const isCI = process.env.CI === "true";

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  coverageProvider: "v8",
  maxWorkers: isCI ? 2 : "50%",
  // OOM対策: ワーカーのメモリが上限を超えたら再起動する
  workerIdleMemoryLimit: "512MB",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Haste (Jestのファイル検索機能) の衝突を避けるため、.nextディレクトリを無視する
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/tests/e2e/",
    "<rootDir>/e2e/",
    // このファイルはテストのヘルパーであり、テスト自体ではないため除外する
    "<rootDir>/__tests__/utils/mockFactory.js",
  ],
};

module.exports = createJestConfig(customJestConfig);
