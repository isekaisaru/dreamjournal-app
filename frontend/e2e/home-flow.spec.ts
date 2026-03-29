import { test, expect } from "@playwright/test";

// テスト用の夢データ（2か月分）
const MOCK_DREAMS = [
  {
    id: 10,
    title: "空飛ぶ夢",
    content: "大空を自由に飛んでいた。",
    created_at: "2026-03-15T10:00:00Z",
    emotions: [{ id: 1, name: "happy" }],
    analysis_json: {
      analysis: "自由への願望を表しています。",
      emotion_tags: ["happy"],
    },
    analysis_status: "done",
  },
  {
    id: 9,
    title: "海の夢",
    content: "深い海を泳いでいた。",
    created_at: "2026-02-20T10:00:00Z",
    emotions: [{ id: 2, name: "peaceful" }],
    analysis_json: null,
    analysis_status: "pending",
  },
];

const MOCK_EMOTIONS = [
  { id: 1, name: "happy" },
  { id: 2, name: "peaceful" },
  { id: 3, name: "scary" },
];

test.describe("ホームページ：認証済みユーザーの夢一覧表示", () => {
  test.beforeEach(async ({ page }) => {
    // 認証チェックをモック
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: 1,
            email: "test@example.com",
            username: "E2Eテスト太郎",
          },
        }),
      });
    });

    // 夢一覧 API をモック
    await page.route("**/dreams**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DREAMS),
      });
    });

    // 感情マスター一覧をモック
    await page.route("**/emotions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_EMOTIONS),
      });
    });

    // E2E バイパス用クッキーを設定
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

  test("ユーザー名が見出しに表示され、夢カードが一覧表示される", async ({
    page,
  }) => {
    await page.goto("/home");

    // ユーザー名を含む見出しが表示されていることを確認
    await expect(
      page.getByRole("heading", { name: /E2Eテスト太郎ちゃんの ゆめ日記/ })
    ).toBeVisible();

    // 夢カードが2件表示されていることを確認
    await expect(page.getByText("空飛ぶ夢")).toBeVisible();
    await expect(page.getByText("海の夢")).toBeVisible();
  });

  test("月別アーカイブリンクが YYYY-MM 形式のURLで表示される", async ({
    page,
  }) => {
    await page.goto("/home");

    // 月別アーカイブリンクが表示されていることを確認
    // MOCK_DREAMS は 2026-03 と 2026-02 の2か月分
    const marchLink = page.getByRole("link", { name: /2026年3月の夢/ });
    const febLink = page.getByRole("link", { name: /2026年2月の夢/ });

    await expect(marchLink).toBeVisible();
    await expect(febLink).toBeVisible();

    // URLが YYYY-MM 形式（日本語文字を含まない）であることを確認
    const marchHref = await marchLink.getAttribute("href");
    const febHref = await febLink.getAttribute("href");

    expect(marchHref).toBe("/dream/month/2026-03");
    expect(febHref).toBe("/dream/month/2026-02");

    // URLに日本語文字（年・月）が含まれていないことを確認
    expect(marchHref).not.toContain("%E5%B9%B4"); // "年" のエンコード
    expect(marchHref).not.toContain("%E6%9C%88"); // "月" のエンコード
  });

  test("検索バーが表示されており、検索実行で API にクエリパラメータが送られる", async ({
    page,
  }) => {
    const dreamRequestUrls: string[] = [];

    await page.route("**/dreams**", async (route) => {
      const requestUrl = route.request().url();
      dreamRequestUrls.push(requestUrl);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          requestUrl.includes("query=") ? [MOCK_DREAMS[0]] : MOCK_DREAMS
        ),
      });
    });

    await page.goto("/home");

    // SearchBar の検索入力欄（id="search-query"）が表示されていることを確認
    const searchInput = page.locator("#search-query");
    await expect(searchInput).toBeVisible();

    // 送信ボタンが表示されていることを確認
    const submitButton = page.getByRole("button", { name: /さがす|検索/i });
    await expect(submitButton).toBeVisible();

    // 実際に検索条件を入力して送信し、URL と API リクエストの双方に反映されることを確認
    await searchInput.fill("空");

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      submitButton.click(),
    ]);

    await expect(page).toHaveURL(/\/home\?query=%E7%A9%BA/);
    await expect
      .poll(() =>
        dreamRequestUrls.some((url) => url.includes("query=%E7%A9%BA"))
      )
      .toBe(true);

    // 検索後の画面に入力値が維持され、モックした絞り込み結果だけが表示されることを確認
    await expect(searchInput).toHaveValue("空");
    await expect(page.getByText("空飛ぶ夢")).toBeVisible();
    await expect(page.getByText("海の夢")).toHaveCount(0);
  });

  test("夢が0件のとき空状態メッセージが表示される", async ({ page }) => {
    // 夢0件をモック（beforeEach のルートを上書き）
    await page.route("**/dreams**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/home");

    // ユーザー名見出しは表示される
    await expect(
      page.getByRole("heading", { name: /E2Eテスト太郎ちゃんの ゆめ日記/ })
    ).toBeVisible();

    // 空状態のメッセージが表示されることを確認
    // DreamList コンポーネントが "まだ ゆめ は ないよ" を表示する
    await expect(page.getByText("まだ ゆめ は ないよ")).toBeVisible();
  });
});
