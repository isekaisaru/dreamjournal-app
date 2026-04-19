import { test, expect } from "@playwright/test";

// テスト用の夢データ（analysis_json を含め、編集フォームの初期状態を再現）
const MOCK_DREAM = {
  id: 1,
  title: "テストの夢",
  content: "空を飛んでいる夢を見た。",
  created_at: "2024-01-15T10:00:00Z",
  emotions: [{ id: 1, name: "happy" }],
  analysis_json: {
    analysis: "空を飛ぶ夢は自由への願望を表しています。",
    emotion_tags: ["happy"],
  },
};

// テスト用の感情マスターデータ（再分析後のタグ検証に使用）
const MOCK_EMOTIONS = [
  { id: 1, name: "happy" },
  { id: 2, name: "sad" },
];

test.describe("夢詳細の閲覧・編集・再分析・保存フロー", () => {
  // 各テストで共通のモックとクッキーを beforeEach でセットアップ
  test.beforeEach(async ({ page }) => {
    // 認証チェックをモックし、保護ルートへのアクセスを許可
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 1, email: "test@example.com", username: "E2Eユーザー", age_group: "child" },
        }),
      });
    });

    // 夢詳細データをモック（GETのみ。PUTは各テストで必要に応じて上書き）
    await page.route("**/dreams/1", async (route, request) => {
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_DREAM),
        });
      } else {
        // GET 以外のメソッドは後続ハンドラへ委譲（テスト側で上書き可能）
        await route.continue();
      }
    });

    // 感情マスター一覧をモック
    await page.route("**/emotions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_EMOTIONS),
      });
    });

    // 再分析APIをモック（デフォルト値。テスト3で上書きする）
    await page.route("**/dreams/preview_analysis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          analysis: "デフォルトの分析テキスト",
          emotion_tags: ["happy"],
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

  test("閲覧モードで夢の詳細が正しく表示される", async ({ page }) => {
    // 夢詳細ページに遷移
    await page.goto("/dream/1");

    // タイトルが表示されていることを確認
    await expect(
      page.getByRole("heading", { name: "テストの夢" })
    ).toBeVisible();

    // 「ゆめの おはなし」セクションに夢の内容が表示されていることを確認
    await expect(page.getByText("ゆめの おはなし")).toBeVisible();
    await expect(page.getByText("空を飛んでいる夢を見た。")).toBeVisible();

    // 「🔮 モルペウスの ゆめうらない」セクションに分析テキストが表示されていることを確認
    // フリップカードは表面・裏面で同ラベルを2つ持つため first() で先頭要素を指定する
    await expect(page.getByText(/🔮 モルペウスの ゆめうらない/).first()).toBeVisible();
    await expect(
      page.getByText("空を飛ぶ夢は自由への願望を表しています。")
    ).toBeVisible();

    // 感情タグが表示されていることを確認（analysis_json.emotion_tags の "happy" が表示される）
    await expect(page.getByText("happy")).toBeVisible();

    // 「✏️ なおす」ボタンが表示されていることを確認
    await expect(
      page.getByRole("button", { name: /✏️ なおす/ })
    ).toBeVisible();
  });

  test("閲覧モードから編集モードへの切り替え", async ({ page }) => {
    await page.goto("/dream/1");

    // 「✏️ なおす」ボタンをクリックして編集モードへ切り替え
    await page.getByRole("button", { name: /✏️ なおす/ }).click();

    // 「ゆめ の なおし」という見出しが表示されることを確認
    await expect(
      page.getByRole("heading", { name: "ゆめ の なおし" })
    ).toBeVisible();

    // タイトルと内容がフォーム入力欄に初期値として入っていることを確認
    await expect(page.locator("#dream-title")).toHaveValue("テストの夢");
    await expect(page.locator("#dream-content")).toHaveValue(
      "空を飛んでいる夢を見た。"
    );

    // 「やめる」ボタンが表示されていることを確認
    await expect(page.getByRole("button", { name: "やめる" })).toBeVisible();

    // 「やめる」をクリックすると閲覧モードに戻ることを確認
    await page.getByRole("button", { name: "やめる" }).click();
    await expect(
      page.getByRole("heading", { name: "テストの夢" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /✏️ なおす/ })
    ).toBeVisible();
  });

  test("編集モードで「もういちどきく」を押すと再分析結果が即時反映される", async ({
    page,
  }) => {
    // 再分析APIを新しい分析内容（元データと異なるタグ）を返すよう上書きモック
    // Playwright はルートハンドラを LIFO 順で評価するため、このハンドラが優先される
    await page.route("**/dreams/preview_analysis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          analysis: "新しい占いテキスト：心の深淵に眠る記憶が蘇っています。",
          emotion_tags: ["sad"],
        }),
      });
    });

    await page.goto("/dream/1");

    // 編集モードへ切り替え
    await page.getByRole("button", { name: /✏️ なおす/ }).click();

    // 夢の内容テキストエリアを書き換える
    await page.locator("#dream-content").fill("深い海の底を泳いでいる夢を見た。");

    // analysis_json がある場合「もういちど きく」ボタンが表示される（初期データに analysis_json あり）
    await page.getByRole("button", { name: /もういちど\s*きく/ }).click();

    // 新しい占いテキストが画面上に表示されることを確認（Playwright の auto-wait で応答を待機）
    await expect(
      page.getByText("新しい占いテキスト：心の深淵に眠る記憶が蘇っています。")
    ).toBeVisible();

    // 新しい感情タグ（sad）に対応するチェックボックスがチェック状態になっていることを確認
    // DreamForm の感情チェックボックスは type="checkbox" className="hidden" で実装されており、
    // label 要素の視覚スタイルで選択状態を表現している
    const sadCheckbox = page
      .locator("label")
      .filter({ hasText: "sad" })
      .locator('input[type="checkbox"]');
    await expect(sadCheckbox).toBeChecked();

    // toastメッセージ「モルペウスが おへんじ したよ！」が表示されることを確認
    await expect(
      page.getByText("モルペウスが おへんじ したよ！")
    ).toBeVisible();
  });

  test("画像未生成時に「🎨 ゆめのえを かく」ボタンが表示される", async ({
    page,
  }) => {
    await page.goto("/dream/1");

    // generated_image_url がない（MOCK_DREAM にはない）ので画像生成ボタンが表示される
    await expect(
      page.getByRole("button", { name: /🎨 ゆめのえを かく/ })
    ).toBeVisible();
  });

  test("「🎨 ゆめのえを かく」をクリックすると POST リクエストが飛び、成功時に画像が表示される", async ({
    page,
  }) => {
    const GENERATED_IMAGE_URL = "https://example.com/dream-image.png";

    // 画像生成 API をモック
    await page.route("**/dreams/1/generate_image", async (route) => {
      expect(route.request().method()).toBe("POST");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ image_url: GENERATED_IMAGE_URL }),
      });
    });

    await page.goto("/dream/1");

    // POST リクエストを捕捉する待ち受けを設定
    const postRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/dreams/1/generate_image") &&
        req.method() === "POST"
    );

    // 「🎨 ゆめのえを かく」ボタンをクリック
    await page.getByRole("button", { name: /🎨 ゆめのえを かく/ }).click();

    // POST リクエストが送信されたことを確認
    await postRequestPromise;

    // 成功後に画像が表示されることを確認
    await expect(page.locator('img[alt="ゆめのえ"]')).toBeVisible();

    // 「かきなおす」ボタンが表示されることを確認
    await expect(
      page.getByRole("button", { name: "かきなおす" })
    ).toBeVisible();
  });

  test("画像生成 API がエラーを返した場合、エラーメッセージが表示される", async ({
    page,
  }) => {
    // 画像生成 API をエラーでモック（タイムアウト相当の 504）
    await page.route("**/dreams/1/generate_image", async (route) => {
      await route.fulfill({
        status: 504,
        contentType: "application/json",
        body: JSON.stringify({
          error: "画像の生成に時間がかかりすぎました。しばらく待ってからお試しください。",
        }),
      });
    });

    await page.goto("/dream/1");

    // ボタンをクリック
    await page.getByRole("button", { name: /🎨 ゆめのえを かく/ }).click();

    // エラーメッセージが表示されることを確認
    await expect(page.locator(".text-destructive")).toBeVisible();

    // エラー後もボタンが再度有効になる（再試行できる状態）ことを確認
    await expect(
      page.getByRole("button", { name: /🎨 ゆめのえを かく/ })
    ).toBeVisible();
  });

  test("編集内容を保存すると閲覧モードに戻る", async ({ page }) => {
    // beforeEach の GET ハンドラを上書きし、PUT と複数回の GET を一括で処理する
    // 1回目の GET: 元のタイトルを返す、PUT: 成功レスポンス、2回目以降の GET: 更新後のタイトルを返す
    let getDreamCallCount = 0;
    await page.route("**/dreams/1", async (route, request) => {
      if (request.method() === "PUT") {
        // PUT リクエストをモックして成功を返す
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...MOCK_DREAM,
            title: "変更後のタイトル",
          }),
        });
      } else if (request.method() === "GET") {
        getDreamCallCount++;
        // updateDream 後に fetchDreamDetail が呼ばれる（2回目の GET）ので
        // 2回目以降は変更後のタイトルを返す
        const title =
          getDreamCallCount >= 2 ? "変更後のタイトル" : "テストの夢";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...MOCK_DREAM, title }),
        });
      }
    });

    await page.goto("/dream/1");

    // 編集モードへ切り替え
    await page.getByRole("button", { name: /✏️ なおす/ }).click();

    // タイトルを変更する
    await page.locator("#dream-title").fill("変更後のタイトル");

    // PUT リクエストを捕捉してデータを検証するために待ち受けを設定
    const putRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/dreams/1") && req.method() === "PUT"
    );

    // 「ゆめを のこす」ボタンをクリックして保存
    await page.getByRole("button", { name: /ゆめを\s*のこす/ }).click();

    // PUT リクエストが正しく送信されたことを確認し、送信データを検証
    const putRequest = await putRequestPromise;
    expect(putRequest.method()).toBe("PUT");
    const requestBody = putRequest.postDataJSON();
    expect(requestBody.dream.title).toBe("変更後のタイトル");

    // 保存後に閲覧モードへ戻り、更新後のタイトルが表示されていることを確認
    await expect(
      page.getByRole("heading", { name: "変更後のタイトル" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /✏️ なおす/ })
    ).toBeVisible();
  });
});
