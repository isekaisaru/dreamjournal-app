import { test, expect } from "@playwright/test";

// 開発バックエンドのベースURL（デフォルト: http://localhost:3001）
const backendBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

test.describe("Password Reset E2E", () => {
  // バックエンドの稼働確認。到達不能ならテストをスキップ。
  async function ensureBackendUp(request: any) {
    try {
      const res = await request.get(`${backendBase}/health`);
      return res.ok();
    } catch {
      return false;
    }
  }

  test("email -> reset link (dev) -> set password -> login", async ({
    page,
    request,
  }) => {
    if (!(await ensureBackendUp(request))) {
      test.skip(true, "Backend is not reachable. Run `make dev-up`.");
    }

    // 1. 事前準備: ユーザー作成（登録）
    const unique = Date.now();
    const email = `e2e-pr-${unique}@example.com`;
    const username = `E2Eユーザー-${unique}`; // ユーザー名の一意性担保
    const oldPassword = "OldPassw0rd!";
    const newPassword = "NewPassw0rd!";

    const registerRes = await request.post(`${backendBase}/auth/register`, {
      data: {
        user: {
          email,
          username,
          password: oldPassword,
          password_confirmation: oldPassword,
        },
      },
    });
    expect(registerRes.ok()).toBeTruthy();

    // 2. メールアドレス入力 -> パスワードリセット要求（開発ではAPIでシミュレーション）
    const resetReq = await request.post(`${backendBase}/password_resets`, {
      data: { email },
    });
    expect(resetReq.ok()).toBeTruthy();

    // 3. リセットリンクのシミュレーション（開発専用エンドポイントでトークン取得）
    const tokenRes = await request.get(
      `${backendBase}/dev/password_resets/token?email=${encodeURIComponent(email)}`
    );
    expect(tokenRes.ok()).toBeTruthy();
    const { token } = (await tokenRes.json()) as { token: string };
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    // 4. 新パスワードの設定（PATCH /password_resets/:token）
    const patchRes = await request.patch(
      `${backendBase}/password_resets/${token}`,
      {
        data: {
          password: newPassword,
          password_confirmation: newPassword,
        },
      }
    );
    expect(patchRes.ok()).toBeTruthy();

    // 5. 新パスワードでログイン（UI操作）
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード").fill(newPassword);

    await page
      .getByRole("main")
      .getByRole("button", { name: "ログイン" })
      .click();

    // ログイン後のページ遷移と、それに伴う非同期処理（データ取得など）が
    // 完了するのを待つため、'networkidle' を使用する。
    // これにより、UIが完全に描画された状態で検証を実行できる。
    await page.waitForURL("**/home");
    await page.waitForLoadState("networkidle");

    // ページが安定した状態で検証を実行
    await expect(page.getByRole("heading", { name: "夢リスト" })).toBeVisible();
    // ユーザー名が直接表示されていない可能性があるため、より堅牢なログイン確認方法として、
    // ログアウトボタンが表示されていることを確認する。
    // これは、ログインしたユーザーにのみ表示される要素である可能性が高い。
    await expect(
      page.getByRole("button", { name: "ログアウト" })
    ).toBeVisible();
  });
});
