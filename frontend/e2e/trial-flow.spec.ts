import { test, expect } from "@playwright/test";

const MOCK_ANALYSIS = {
  analysis: "空を飛ぶ夢は、自由への願望や解放感を象徴しています。",
  emotion_tags: ["自由", "希望"],
};

test.describe("トライアルページ：お試し体験フロー", () => {
  test.beforeEach(async ({ page }) => {
    // 未認証状態をモック
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });

    // apiFetch は /auth/verify の 401 時に refresh を試す。
    // トライアルE2Eでは未認証状態を維持したいので、refresh も明示的に 401 で返す。
    await page.route("**/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });
  });

  test("ページが表示され残りAI分析回数バッジが初期3回を示す", async ({
    page,
  }) => {
    await page.goto("/trial");

    await expect(page.getByRole("heading", { name: "YumeTree を体験する" })).toBeVisible();
    // バッジに「残りAI分析: 3回」が表示されることを確認（下部CTAの「3回」と区別するためfilterを使う）
    await expect(
      page.locator("span").filter({ hasText: /残りAI分析:/ })
    ).toContainText("3回");
  });

  test("説明なしではAIボタンが無効になる", async ({ page }) => {
    await page.goto("/trial");

    await expect(
      page.getByRole("button", { name: "AIにきいてみる" })
    ).toBeDisabled();
  });

  test("AI分析が成功すると夢リストに追加され残り回数が減る", async ({
    page,
  }) => {
    // トライアルログインをモック
    await page.route("**/auth/trial_login", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 99, email: "trial_test@example.com", username: "trial_99" },
        }),
      });
    });

    // AI分析をモック
    await page.route("**/dreams/preview_analysis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYSIS),
      });
    });

    await page.goto("/trial");

    await page.locator("#title").fill("空を飛ぶ夢");
    await page.locator("#description").fill("大空を自由に飛んでいた。");

    await page.getByRole("button", { name: "AIにきいてみる" }).click();

    // 分析結果が表示される
    await expect(page.getByText("モルペウスの分析")).toBeVisible();
    await expect(
      page.getByText("空を飛ぶ夢は、自由への願望や解放感を象徴しています。")
    ).toBeVisible();
    await expect(page.getByText("自由", { exact: true })).toBeVisible();

    // 夢リストが1件になる
    await expect(page.getByText("記録した夢 (1/7)")).toBeVisible();

    // 残り回数が2回になる
    await expect(page.getByText("2回")).toBeVisible();
  });

  test("分析3回後にアップグレードカードが表示される", async ({ page }) => {
    await page.route("**/auth/trial_login", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 99, email: "trial_test@example.com", username: "trial_99" },
        }),
      });
    });

    let analysisCallCount = 0;
    await page.route("**/dreams/preview_analysis", async (route) => {
      analysisCallCount++;
      if (analysisCallCount > 3) {
        // バックエンドが上限エラーを返す
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: "分析上限に達しました" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_ANALYSIS),
        });
      }
    });

    await page.goto("/trial");

    // 3回分析を実行する
    for (let i = 1; i <= 3; i++) {
      await page.locator("#description").fill(`ゆめ ${i} の内容`);
      await page.getByRole("button", { name: "AIにきいてみる" }).click();
      await expect(page.getByText(`記録した夢 (${i}/7)`)).toBeVisible();
    }

    // 4回目でバックエンドが上限エラーを返す
    await page.locator("#description").fill("4回目のゆめ");
    await page.getByRole("button", { name: "AIにきいてみる" }).click();

    // アップグレードカードが表示される
    await expect(
      page.getByText("体験版のAI分析を使い切りました")
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /YumeTreeに登録する/ })
    ).toBeVisible();
  });

  test("アップグレードカードの登録リンクが /register に遷移する", async ({
    page,
  }) => {
    await page.route("**/auth/trial_login", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 99, email: "trial_test@example.com", username: "trial_99" },
        }),
      });
    });

    await page.route("**/dreams/preview_analysis", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "分析上限に達しました" }),
      });
    });

    await page.goto("/trial");

    await page.locator("#description").fill("ゆめの内容");
    await page.getByRole("button", { name: "AIにきいてみる" }).click();

    const registerLink = page.getByRole("link", { name: /YumeTreeに登録する/ });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute("href", "/register");
  });

  test("下部の登録CTAボタンが /register に遷移する", async ({ page }) => {
    await page.goto("/trial");

    const ctaLink = page.getByRole("link", { name: "YumeTreeに登録する" });
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute("href", "/register");
  });

  test("分析上限到達時に下部CTAが非表示になりアップグレードカードのみ表示される", async ({
    page,
  }) => {
    await page.route("**/auth/trial_login", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 99, email: "trial_test@example.com", username: "trial_99" },
        }),
      });
    });

    await page.route("**/dreams/preview_analysis", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "分析上限に達しました" }),
      });
    });

    await page.goto("/trial");

    await page.locator("#description").fill("ゆめの内容");
    await page.getByRole("button", { name: "AIにきいてみる" }).click();

    // アップグレードカードが表示される
    await expect(
      page.getByText("体験版のAI分析を使い切りました")
    ).toBeVisible();

    // 下部CTA（「体験版のAI分析は〜」の注意書きを含むセクション）が非表示になる
    // アップグレードカードにも同名リンクがあるためリンクテキストではなくセクション固有テキストで判定する
    await expect(
      page.getByText(/体験版のAI分析は/)
    ).not.toBeVisible();
  });

  test("分析なしで記録だけできる", async ({ page }) => {
    await page.goto("/trial");

    await page.locator("#title").fill("タイトルだけ");
    await page.locator("#description").fill("内容を書いた");

    await page.getByRole("button", { name: "記録だけする（分析なし）" }).click();

    await expect(page.getByText("記録した夢 (1/7)")).toBeVisible();
    await expect(page.getByText("タイトルだけ")).toBeVisible();
    // AI分析結果は表示されない
    await expect(page.getByText("モルペウスの分析")).not.toBeVisible();
  });
});
