import {
  defineConfig,
  devices,
  type PlaywrightTestConfig,
} from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    // `docker ps` の結果に合わせて 3000 に修正
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // webServerの設定。CIでもローカルでも共通して利用する。
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    // CIでない場合は既存のサーバーを再利用する。手動で `yarn dev` してデバッグしやすくするため。
    // CIでは常に新しいサーバーを起動する。
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // サーバー起動のタイムアウトを120秒に設定
    // E2Eテスト実行中であることをNext.jsアプリケーションに伝えるための環境変数
    env: {
      NEXT_PUBLIC_E2E: "1",
    },
  },
});
