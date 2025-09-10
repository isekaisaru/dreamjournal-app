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
    // __tests__ にテストを集中させるため、app配下の空ファイルは無視する
    '<rootDir>/app/components/DreamAnalysis.test.tsx',
  ],
}

module.exports = createJestConfig(customJestConfig)
module.exports = createJestConfig(customJestConfig)