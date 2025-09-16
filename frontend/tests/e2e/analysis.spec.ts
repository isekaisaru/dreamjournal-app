import { test, expect } from "@playwright/test";

test.describe("Dream Analysis", () => {
  // テスト全体で共通のモック設定を beforeEach にまとめることで、コードの重複をなくし、可読性を向上させます。
  test.beforeEach(async ({ page }) => {
    // 認証チェックをモックし、保護されたページへのアクセスを許可
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 1, email: "test@example.com", username: "E2Eユーザー" },
        }),
      });
    });

    // 夢詳細ページのデータ取得をモック
    await page.route("**/dreams/1", async (route) => {
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

    // 解析開始エンドポイント（POST /dreams/1/analyze）をモック
    // ホスト名の違いやパスの揺れに強いワイルドカード
    await page.route("**/dreams/*/analyze", async (route) => {
      await route.fulfill({ status: 202 });
    });

    // ミドルウェアのE2Eバイパス用クッキーと、ダミーのアクセストークンを設定
    await page
      .context()
      .addCookies([
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

  test("clicking analyze button shows pending state", async ({ page }) => {
    // このテストはネットワークモックを使い、分析ボタンのUI応答をテストします。
    // これにより、ログインフローやDBのseedデータに依存せず、UIの振る舞いを独立して検証できます。

    // 分析APIのエンドポイントをモックします。
    // このテストでは、コンポーネントマウント時の初期ステータスチェック（GET）の挙動を上書きします。
    await page.route("**/dreams/1/analysis", async (route, request) => { // POSTのモックはbeforeEachで共通化されているため、ここではGETのみを扱う
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
    await page.route("**/dreams/1/analysis", async (route, request) => {
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
    const analyzeBtn = page.getByRole("button", { name: "この夢を分析する" });
    // 初期状態でボタンが見えていればクリック（既にpending表示のケースにも対応）
    if (await analyzeBtn.isVisible()) {
      await analyzeBtn.click();
    }

    // 3. "分析中..." の状態を待つ（クリック済み、またはすでにpendingの場合）
    await expect(page.getByRole("button", { name: "分析中..." })).toBeVisible();

    // 4. 最終的な分析結果が表示されるのを待つ (Playwrightが自動で待機)
    // ポーリングに時間がかかる可能性を考慮し、タイムアウトを長めに設定
    await expect(page.getByText("分析結果")).toBeVisible({ timeout: 15000 });

    // 5. 分析ボタンが非表示になっていることを確認
    await expect(
      page.getByRole("button", { name: "この夢を分析する" })
    ).not.toBeVisible();
  });
});
