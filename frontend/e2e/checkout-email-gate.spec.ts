import { test, expect, type Page } from "@playwright/test";

// PR #541 の回帰テスト（APIモックのみ。実 backend / Stripe には接続しない）。
// POST /api/checkout が 403 + email_verification_required: true を返したときだけ
// メール確認バナーを出し、それ以外の失敗は従来どおり汎用エラーを出すことを確認する。
const GENERIC_ERROR = "決済ページの準備に失敗しました。";
const BANNER_NAME = "メールアドレス確認のお知らせ";
const RESEND_BUTTON = "かくにんメールを もういちど おくる";

const EMAIL_GATE_BODY = {
  error: "メールアドレスの確認が必要です。",
  email_verification_required: true,
};

type CheckoutMock = { status: number; body: unknown };

type CapturedCheckout = {
  method: string;
  contentType: string | undefined;
  postData: string | null;
};

// email-verification-flow.spec.ts と同じ方針:
// アプリ自身のページ以外・未モックの /api|/proxy へのリクエストは abort して外部に出さない。
async function mockApp(page: Page, baseURL: string, checkout: CheckoutMock) {
  const appOrigin = new URL(baseURL).origin;
  const captured: CapturedCheckout[] = [];

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/(api|proxy)(?=\/)/, "");

    if (path === "/auth/verify") {
      // /subscription は認証済み・未プレミアム・メール未確認として描画させる
      await route.fulfill({
        json: {
          user: {
            id: 1,
            email: "qa@example.test",
            username: "決済QA",
            trial_user: false,
            premium: false,
            email_verified: false,
          },
        },
      });
    } else if (
      url.origin !== appOrigin ||
      /^\/(api|proxy)\//.test(url.pathname)
    ) {
      await route.abort();
    } else {
      await route.continue();
    }
  });

  // 後から登録したルートが優先されるため、上のキャッチオールより先に評価される
  await page.route("**/api/checkout", async (route) => {
    const request = route.request();
    captured.push({
      method: request.method(),
      contentType: request.headers()["content-type"],
      postData: request.postData(),
    });
    await route.fulfill({
      status: checkout.status,
      contentType: "application/json",
      body: JSON.stringify(checkout.body),
    });
  });

  await page.context().addCookies([
    { name: "access_token", value: "fake-e2e-token", url: baseURL },
    { name: "__e2e__", value: "1", url: baseURL },
  ]);

  return captured;
}

const GENERIC_FAILURES: Array<{ label: string } & CheckoutMock> = [
  {
    label: "403（email_verification_required なし）",
    status: 403,
    body: { error: "権限がありません。" },
  },
  {
    label: "403（email_verification_required: false）",
    status: 403,
    body: { error: "権限がありません。", email_verification_required: false },
  },
  {
    label: "500",
    status: 500,
    body: { error: "FRONTEND_URLが設定されていません。" },
  },
];

test.describe("寄付: メール未確認ゲートの案内（APIモック）", () => {
  test("403 + email_verification_required でバナーを表示し汎用エラーは出さない", async ({
    page,
    baseURL,
  }) => {
    const captured = await mockApp(page, baseURL!, {
      status: 403,
      body: EMAIL_GATE_BODY,
    });

    await page.goto("/donation");
    const donateButton = page.getByRole("button", { name: "500円で応援する" });
    await expect(donateButton).toBeVisible();
    await donateButton.click();

    const banner = page.getByRole("region", { name: BANNER_NAME });
    await expect(banner).toBeVisible();
    await expect(
      banner.getByText("おうえんするには メールの かくにんが ひつようだよ")
    ).toBeVisible();
    await expect(
      banner.getByRole("button", { name: RESEND_BUTTON })
    ).toBeEnabled();
    await expect(page.getByText(GENERIC_ERROR)).toHaveCount(0);
    // 失敗後はボタンが再度押せる状態に戻る
    await expect(donateButton).toBeEnabled();

    // リクエストの形は従来どおり（POST・ボディなし）
    expect(captured).toHaveLength(1);
    expect(captured[0].method).toBe("POST");
    expect(captured[0].postData).toBeNull();
  });

  for (const failure of GENERIC_FAILURES) {
    test(`${failure.label} では汎用エラーを表示しバナーは出さない`, async ({
      page,
      baseURL,
    }) => {
      const captured = await mockApp(page, baseURL!, failure);

      await page.goto("/donation");
      const donateButton = page.getByRole("button", {
        name: "500円で応援する",
      });
      await donateButton.click();

      // 先に汎用エラーの表示を待つことで、「バナーなし」の確認が描画前の空振りにならない
      await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
      await expect(page.getByRole("region", { name: BANNER_NAME })).toHaveCount(
        0
      );
      await expect(donateButton).toBeEnabled();

      expect(captured).toHaveLength(1);
      expect(captured[0].method).toBe("POST");
      expect(captured[0].postData).toBeNull();
    });
  }
});

test.describe("プレミアム: メール未確認ゲートの案内（APIモック）", () => {
  test("403 + email_verification_required でバナーを表示し汎用エラーは出さない", async ({
    page,
    baseURL,
  }) => {
    const captured = await mockApp(page, baseURL!, {
      status: 403,
      body: EMAIL_GATE_BODY,
    });

    await page.goto("/subscription");
    // 上部CTA（下部CTAは「月額¥590で〜」なので exact で区別する）
    const subscribeButton = page.getByRole("button", {
      name: "プレミアムを始める",
      exact: true,
    });
    await expect(subscribeButton).toBeVisible();
    await subscribeButton.click();

    const banner = page.getByRole("region", { name: BANNER_NAME });
    await expect(banner).toBeVisible();
    await expect(
      banner.getByText("プレミアムに とうろくするには メールの かくにんが ひつようだよ")
    ).toBeVisible();
    await expect(
      banner.getByRole("button", { name: RESEND_BUTTON })
    ).toBeEnabled();
    await expect(page.getByText(GENERIC_ERROR)).toHaveCount(0);
    await expect(subscribeButton).toBeEnabled();

    // リクエストの形は従来どおり（POST・JSON で plan: "premium"）
    expect(captured).toHaveLength(1);
    expect(captured[0].method).toBe("POST");
    expect(captured[0].contentType).toContain("application/json");
    expect(JSON.parse(captured[0].postData ?? "null")).toEqual({
      plan: "premium",
    });
  });

  for (const failure of GENERIC_FAILURES) {
    test(`${failure.label} では汎用エラーを表示しバナーは出さない`, async ({
      page,
      baseURL,
    }) => {
      const captured = await mockApp(page, baseURL!, failure);

      await page.goto("/subscription");
      const subscribeButton = page.getByRole("button", {
        name: "プレミアムを始める",
        exact: true,
      });
      await subscribeButton.click();

      await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
      await expect(page.getByRole("region", { name: BANNER_NAME })).toHaveCount(
        0
      );
      await expect(subscribeButton).toBeEnabled();

      expect(captured).toHaveLength(1);
      expect(captured[0].method).toBe("POST");
      expect(JSON.parse(captured[0].postData ?? "null")).toEqual({
        plan: "premium",
      });
    });
  }
});
