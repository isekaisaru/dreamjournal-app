import { test, expect } from "@playwright/test";

const STRIPE_CHECKOUT_URL =
  "https://checkout.stripe.com/c/pay/cs_test_mock_123";

test.describe("寄付（決済）フロー", () => {
  test("寄付ボタンクリックで POST /api/checkout にリクエストが飛ぶ", async ({
    page,
  }) => {
    // /api/checkout をモックして Stripe の URL を返す
    await page.route("**/api/checkout", async (route) => {
      expect(route.request().method()).toBe("POST");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: STRIPE_CHECKOUT_URL }),
      });
    });

    // /api/checkout へのリクエストを捕捉する
    const checkoutRequestPromise = page.waitForRequest(
      (req) => req.url().includes("/api/checkout") && req.method() === "POST"
    );

    await page.goto("/donation");

    // 寄付ボタンが表示されていることを確認
    const donateButton = page.getByRole("button", { name: /応援する/i });
    await expect(donateButton).toBeVisible();

    // ボタンクリック → リクエスト送信の検証
    await donateButton.click();
    const checkoutRequest = await checkoutRequestPromise;
    expect(checkoutRequest.method()).toBe("POST");
    expect(checkoutRequest.url()).toContain("/api/checkout");
  });

  test("API 呼び出し成功後、Stripe の checkout URL へリダイレクトされる", async ({
    page,
  }) => {
    // /api/checkout をモック
    await page.route("**/api/checkout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: STRIPE_CHECKOUT_URL }),
      });
    });

    // Stripe checkout URL へのナビゲーションをインターセプト（外部への実際のリクエストを防ぐ）
    await page.route(STRIPE_CHECKOUT_URL, async (route) => {
      await route.fulfill({ status: 200, body: "Stripe checkout page" });
    });

    await page.goto("/donation");

    const donateButton = page.getByRole("button", { name: /応援する/i });
    await donateButton.click();

    // Stripe の URL に遷移することを確認
    await page.waitForURL(STRIPE_CHECKOUT_URL, { timeout: 5000 });
    expect(page.url()).toBe(STRIPE_CHECKOUT_URL);
  });

  test("API エラー時にエラーメッセージが表示される", async ({ page }) => {
    // /api/checkout を 500 でモック
    await page.route("**/api/checkout", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "FRONTEND_URLが設定されていません。" }),
      });
    });

    await page.goto("/donation");

    const donateButton = page.getByRole("button", { name: /応援する/i });
    await donateButton.click();

    // エラーメッセージが表示されることを確認
    await expect(
      page.getByText(/決済ページの準備に失敗しました/i)
    ).toBeVisible();

    // ボタンが再度クリック可能な状態に戻っていることを確認
    await expect(donateButton).toBeEnabled();
  });
});
