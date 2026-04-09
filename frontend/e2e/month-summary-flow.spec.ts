import { test, expect } from "@playwright/test";

// テスト用の夢データ（2件。分析済み1件・未分析1件）
const MOCK_DREAMS = [
  {
    id: 1,
    title: "空を飛ぶ夢",
    content: "空を飛んでいる夢を見た。",
    created_at: "2024-01-15T10:00:00Z",
    emotions: [{ id: 1, name: "happy" }],
    analysis_json: {
      analysis: "自由への願望を表しています。",
      emotion_tags: ["happy"],
    },
    analysis_status: "done",
  },
  {
    id: 2,
    title: "海の底の夢",
    content: "深い海の底を泳いでいた。",
    created_at: "2024-01-20T08:00:00Z",
    emotions: [{ id: 2, name: "sad" }],
    analysis_json: null,
    analysis_status: "pending",
  },
];

test.describe("月次サマリーページ", () => {
  // 各テストで共通のモックとクッキーを beforeEach でセットアップ
  test.beforeEach(async ({ page }) => {
    // 認証チェックをモック
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 1, email: "test@example.com", username: "E2Eユーザー" },
        }),
      });
    });

    // E2Eバイパス用クッキーとダミーのアクセストークンを設定
    await page.context().addCookies([
      {
        name: "access_token",
        value: "fake-e2e-token",
        url: "http://localhost:3000",
      },
      {
        name: "__e2e__",
        value: "1",
        url: "http://localhost:3000",
      },
    ]);
  });

  test("夢がある月は件数・日数・分析済み数・感情タグ・サマリーメッセージが表示される", async ({
    page,
  }) => {
    await page.route("**/dreams/month/2024-01", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DREAMS),
      });
    });

    await page.goto("/dream/month/2024-01");

    // ページタイトルが正しく表示される
    await expect(
      page.getByRole("heading", { name: "2024年1月の ゆめ" })
    ).toBeVisible();

    // 統計カードのラベルと数値が正しく表示される
    // ラベルを含む card の中に数値が正しくあることを確認（数値ゼロでも合格する誤検知を防ぐ）
    const dreamCountCard = page.locator("div").filter({ hasText: /^きろくした ゆめ/ }).first();
    await expect(dreamCountCard.getByText("2")).toBeVisible();

    const recordedDaysCard = page.locator("div").filter({ hasText: /^きろくした ひ/ }).first();
    await expect(recordedDaysCard.getByText("2")).toBeVisible();

    const analyzedCountCard = page.locator("div").filter({ hasText: /^ぶんせきずみ/ }).first();
    await expect(analyzedCountCard.getByText("1")).toBeVisible();

    // サマリーメッセージが表示される
    await expect(
      page.getByText(/2024年1月は 2この ゆめを きろくしたよ/)
    ).toBeVisible();

    // 感情タグセクションが表示される
    await expect(page.getByText("よく出てきた きもち")).toBeVisible();

    // 夢一覧のタイトルが表示される
    await expect(page.getByText("この月の ゆめ一覧")).toBeVisible();
  });

  test("夢がない月は空状態メッセージと「ゆめをかく」リンクが表示される", async ({
    page,
  }) => {
    await page.route("**/dreams/month/2024-02", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/dream/month/2024-02");

    // 空状態メッセージが表示される
    await expect(
      page.getByText("まだ この月の ゆめは ないよ")
    ).toBeVisible();

    // 「ゆめをかく」リンクが表示される
    await expect(page.getByRole("link", { name: "ゆめを かく" })).toBeVisible();
  });

  test("APIエラー時はエラーメッセージが表示される", async ({ page }) => {
    await page.route("**/dreams/month/2024-03", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/dream/month/2024-03");

    // エラーメッセージが表示される
    await expect(
      page.getByText("この月の ゆめを よみこめなかったよ。")
    ).toBeVisible();
  });

  test("「ホームにもどる」リンクが表示される", async ({ page }) => {
    await page.route("**/dreams/month/2024-01", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DREAMS),
      });
    });

    await page.goto("/dream/month/2024-01");

    // ホームへのリンクが表示される
    await expect(
      page.getByRole("link", { name: "← ホームにもどる" })
    ).toBeVisible();
  });
});
