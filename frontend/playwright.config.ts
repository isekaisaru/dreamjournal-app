import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // `docker ps` の結果に合わせて 3000 に修正
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // webServerの設定をCI環境とローカル環境で分ける
  webServer: (() => {
    // ローカル開発では、すでに `docker-compose up` でサーバーが起動していることを前提とします。
    // Playwrightはサーバーを起動せず、既存のサーバーに接続しに行きます。
    if (!process.env.CI) {
      return undefined; // ローカルではwebServerの設定を無効化し、手動起動したサーバーを使う
    }
    // CI環境では、PlaywrightがWebサーバーを起動します。
    return {
      command: 'yarn dev',
      url: 'http://localhost:3000', // サーバーが起動するのを待つURL
      reuseExistingServer: false, // 常に新しいサーバーを起動
      timeout: 120 * 1000, // サーバー起動のタイムアウト
    };
  })(),
});