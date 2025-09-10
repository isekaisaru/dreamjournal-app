import { test, expect } from "@playwright/test";

test.describe("Dream Analysis", () => {
  // テスト全体で共通のモック設定を beforeEach にまとめることで、コードの重複をなくし、可読性を向上させます。
  test.beforeEach(async ({ page }) => {
    // 認証チェックをモックし、保護されたページへのアクセスを許可
    await page.route("**/api/v1/auth/verify", async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 1, email: "test@example.com" }),
      });
    });

    // 夢詳細ページのデータ取得をモック
    await page.route("**/api/v1/dreams/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 1,
          title: "E2E Test Dream",
          content: "Some content to analyze.",
          created_at: new Date().toISOString(),
          emotions: [],
        }),
      });
    });

    // ミドルウェアが認証チェックを行うように、ダミーのクッキーを設定
    await page
      .context()
      .addCookies([
        {
          name: "access_token",
          value: "fake-e2e-token",
          url: "http://localhost:3000",
        },
      ]);
  });

  test("clicking analyze button shows pending state", async ({ page }) => {
    // このテストはネットワークモックを使い、分析ボタンのUI応答をテストします。
    // これにより、ログインフローやDBのseedデータに依存せず、UIの振る舞いを独立して検証できます。

    // 分析APIのエンドポイントをモックします。
    // 1つのrouteハンドラでGETとPOSTを両方扱うことで、コードが明確になります。
    await page.route("**/api/v1/dreams/1/analysis", async (route, request) => {
      if (request.method() === "GET") {
        // コンポーネントマウント時の初期ステータスチェック
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: null,
            result: null,
            analyzed_at: null,
          }),
        });
      } else if (request.method() === "POST") {
        // 分析開始リクエスト
        await route.fulfill({ status: 202 });
      }
    });

    // 夢詳細ページに遷移します。
    await page.goto("/dream/1");

    // ボタンをクリックし、UIの表示が変わることを確認します。
    const analyzeButton = page.getByRole("button", {
      name: "この夢を分析する",
    });
    await expect(analyzeButton).toBeVisible();
    await analyzeButton.click();

    await expect(page.getByRole("button", { name: "分析中..." })).toBeVisible();
    await expect(
      page.getByText("分析結果を取得中です。しばらくお待ちください...")
    ).toBeVisible();
  });

  test("shows analysis result after polling completes", async ({ page }) => {
    let pollCount = 0;
    const analysisResult = {
      text: "これはAIによる分析結果です。素晴らしい夢ですね！",
    };

    // GET /analysis のリクエストを複数回ハンドリングし、ポーリングをシミュレートします。
    await page.route("**/api/v1/dreams/1/analysis", async (route, request) => {
      if (request.method() === "POST") {
        await route.fulfill({ status: 202 });
        return;
      }

      // GET request
      pollCount++;
      if (pollCount === 1) {
        // 1. ページロード時の初回GET
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            status: null,
            result: null,
            analyzed_at: null,
          }),
        });
      } else if (pollCount <= 3) {
        // 2, 3. ポーリング中のGET
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            status: "pending",
            result: null,
            analyzed_at: null,
          }),
        });
      } else {
        // 4. ポーリング完了時のGET
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            status: "done",
            result: analysisResult,
            analyzed_at: new Date().toISOString(),
          }),
        });
      }
    });

    // 1. ページに遷移
    await page.goto("/dream/1");
    await expect(
      page.getByRole("button", { name: "この夢を分析する" })
    ).toBeVisible();

    // 2. ボタンをクリック
    await page.getByRole("button", { name: "この夢を分析する" }).click();

    // 3. "分析中..." の状態を待つ
    await expect(page.getByRole("button", { name: "分析中..." })).toBeVisible();

    // 4. 最終的な分析結果が表示されるのを待つ (Playwrightが自動で待機)
    // ポーリングに時間がかかる可能性を考慮し、タイムアウトを長めに設定
    await expect(page.getByText("分析結果")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(analysisResult.text)).toBeVisible();

    // 5. 分析ボタンが非表示になっていることを確認
    await expect(
      page.getByRole("button", { name: "この夢を分析する" })
    ).not.toBeVisible();
  });
});
