const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Haste (Jestのファイル検索機能) の衝突を避けるため、.nextディレクトリを無視する
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/tests/e2e/',
    // このファイルはテストのヘルパーであり、テスト自体ではないため除外する
    '<rootDir>/__tests__/utils/mockFactory.js',
  ],
}

module.exports = createJestConfig(customJestConfig)