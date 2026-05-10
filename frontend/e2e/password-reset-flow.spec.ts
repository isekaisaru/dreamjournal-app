import { test, expect } from "@playwright/test";

test.describe("パスワードリセットフロー", () => {
  test.beforeEach(async ({ page }) => {
    // 未認証状態をモック（認証済みユーザーへのリダイレクトを防ぐ）
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });
  });

  // ─── フォーム表示 ───────────────────────────────────────────────

  test("パスワードリセットフォームが表示される", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { name: "パスワードのリセット" })
    ).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "リセットリンクを送信" })
    ).toBeVisible();
  });

  test("ログインページの「パスワードを わすれたとき」リンクが forgot-password に遷移する", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "パスワードを わすれたとき" }).click();

    await expect(page).toHaveURL("/forgot-password");
    await expect(
      page.getByRole("heading", { name: "パスワードのリセット" })
    ).toBeVisible();
  });

  // ─── バリデーション（クライアント側） ───────────────────────────

  test("メールアドレスが空のまま送信するとエラーが表示される", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByRole("button", { name: "リセットリンクを送信" }).click();

    await expect(page.getByText("メールアドレスを入力してください。")).toBeVisible();
  });

  test("不正なメールアドレス形式で送信するとエラーが表示される", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByLabel("メールアドレス").fill("invalid-email");
    await page.getByRole("button", { name: "リセットリンクを送信" }).click();

    await expect(
      page.getByText("有効なメールアドレスを入力してください。")
    ).toBeVisible();
  });

  // ─── 送信中ローディング ─────────────────────────────────────────

  test("送信中はボタンが「送信中...」になる", async ({ page }) => {
    // レスポンスを意図的に遅延させてローディング状態を観察する
    await page.route("**/password_resets", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "ok" }),
      });
    });

    await page.goto("/forgot-password");
    await page.getByLabel("メールアドレス").fill("user@example.com");

    await page.getByRole("button", { name: "リセットリンクを送信" }).click();

    // ボタンテキストが「送信中...」に変わり、disabled になること
    const sendingButton = page.getByRole("button", { name: "送信中..." });
    await expect(sendingButton).toBeVisible();
    await expect(sendingButton).toBeDisabled();
  });

  // ─── API 通信（モック） ─────────────────────────────────────────

  test("送信成功時に成功メッセージが表示され、入力欄がクリアされる", async ({
    page,
  }) => {
    await page.route("**/password_resets", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "ok" }),
      });
    });

    await page.goto("/forgot-password");
    await page.getByLabel("メールアドレス").fill("user@example.com");
    await page.getByRole("button", { name: "リセットリンクを送信" }).click();

    await expect(
      page.getByText(
        "パスワードリセットの手順をメールで送信しました。メールをご確認ください。"
      )
    ).toBeVisible();

    // 送信後に入力欄がクリアされること
    await expect(page.getByLabel("メールアドレス")).toHaveValue("");
  });

  test("API がエラーを返したときサーバーのエラーメッセージが表示される", async ({
    page,
  }) => {
    await page.route("**/password_resets", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "ユーザーが見つかりません。" }),
      });
    });

    await page.goto("/forgot-password");
    await page.getByLabel("メールアドレス").fill("notfound@example.com");
    await page.getByRole("button", { name: "リセットリンクを送信" }).click();

    await expect(
      page.getByText("ユーザーが見つかりません。")
    ).toBeVisible();
  });

  test("API がエラーをJSONで返せなかったときフォールバックメッセージが表示される", async ({
    page,
  }) => {
    await page.route("**/password_resets", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Internal Server Error",
      });
    });

    await page.goto("/forgot-password");
    await page.getByLabel("メールアドレス").fill("user@example.com");
    await page.getByRole("button", { name: "リセットリンクを送信" }).click();

    await expect(
      page.getByText("リクエストの処理中にエラーが発生しました。")
    ).toBeVisible();
  });

  // ─── ナビゲーション ─────────────────────────────────────────────

  test("「ログイン画面へ戻る」リンクでログインページに戻れる", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await page.getByRole("link", { name: "ログイン画面へ戻る" }).click();

    await expect(page).toHaveURL("/login");
  });
});
