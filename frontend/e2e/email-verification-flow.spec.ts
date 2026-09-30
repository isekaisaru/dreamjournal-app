import { test, expect } from "@playwright/test";

// Browser/API-response tests only: no SMTP, Resend, real mailbox or backend DB.
const FIXTURE_TOKEN = "email-verification-e2e-fixture";
let mockEmailVerified = false;

test.describe("メール確認リンクと再送案内（APIモック）", () => {
  test.beforeEach(async ({ page, baseURL }) => {
    mockEmailVerified = false;
    if (!baseURL) throw new Error("A local E2E baseURL is required");
    const appOrigin = new URL(baseURL).origin;

    // Mock the API endpoints used by /home; block all other outbound requests.
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^\/(api|proxy)(?=\/)/, "");
      let body: unknown;
      if (path === "/auth/verify") {
        body = {
          user: {
            id: 1,
            email: "qa@example.test",
            username: "メールQA",
            trial_user: false,
            email_verified: mockEmailVerified,
          },
        };
      } else if (["/dreams", "/dream_profiles", "/emotions"].includes(path)) {
        body = [];
      } else if (path === "/dreams/analysis_quota") {
        body = { used: 0, limit: 10, remaining: 10 };
      }

      if (body !== undefined) {
        await route.fulfill({ json: body });
      } else if (
        url.origin !== appOrigin ||
        /^\/(api|proxy)\//.test(url.pathname)
      ) {
        await route.abort();
      } else {
        await route.continue();
      }
    });

    await page.context().addCookies([
      { name: "access_token", value: "fake-e2e-token", url: baseURL },
      { name: "__e2e__", value: "1", url: baseURL },
    ]);
  });

  test("トークンがないリンクでは検証APIを呼ばず設定へ案内する", async ({
    page,
  }) => {
    let verificationCalls = 0;
    await page.route("**/auth/verify_email", async (route) => {
      verificationCalls += 1;
      await route.fulfill({ json: { email_verified: true } });
    });

    await page.goto("/verify-email");
    await expect(
      page.getByRole("heading", { name: "かくにん できなかったよ" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "せっていへ いく" })
    ).toHaveAttribute("href", "/settings");
    expect(verificationCalls).toBe(0);
  });

  test("期限切れのAPI応答では成功を表示せず再送へ案内する", async ({
    page,
  }) => {
    await page.route("**/auth/verify_email", async (route) => {
      await route.fulfill({ status: 422, json: { error: "期限切れです" } });
    });

    await page.goto(`/verify-email?token=${FIXTURE_TOKEN}`);
    await expect(
      page.getByRole("heading", { name: "かくにん できなかったよ" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "かくにん できたよ！" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "せっていへ いく" })
    ).toHaveAttribute("href", "/settings");
  });

  test("確認成功後にホームへ進むと更新した確認状態が反映される", async ({
    page,
  }) => {
    await page.route("**/auth/verify_email", async (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ token: FIXTURE_TOKEN });
      mockEmailVerified = true;
      await route.fulfill({
        json: { message: "確認しました", email_verified: true },
      });
    });

    await page.goto(`/verify-email?token=${FIXTURE_TOKEN}`);
    await expect(
      page.getByRole("heading", { name: "かくにん できたよ！" })
    ).toBeVisible();
    await page.getByRole("link", { name: "ホームへ すすむ" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole("heading", { name: "今日の夢を記録する" })
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "メールアドレス確認のお知らせ" })
    ).toHaveCount(0);
  });

  test("再送成功の案内とクールダウンをreload後も保持する", async ({ page }) => {
    let resendCalls = 0;
    await page.route("**/auth/resend_verification", async (route) => {
      expect(route.request().method()).toBe("POST");
      resendCalls += 1;
      await route.fulfill({ json: { message: "送信を受け付けました" } });
    });

    await page.goto("/home");
    const banner = page.getByRole("region", {
      name: "メールアドレス確認のお知らせ",
    });
    await expect(banner).toBeVisible();
    await banner
      .getByRole("button", { name: "かくにんメールを もういちど おくる" })
      .click();
    await expect(
      banner.getByText("かくにんメールを おくったよ。")
    ).toBeVisible();
    await expect(banner.getByText("qa*@example.test")).toBeVisible();
    await expect(banner.getByRole("button", { name: /^あと / })).toBeDisabled();

    await page.reload();
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("button", { name: /^あと / })).toBeDisabled();
    expect(resendCalls).toBe(1);
  });
});
