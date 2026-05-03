import { test, expect } from "@playwright/test";

test.describe("ユーザー登録フロー", () => {
  test.beforeEach(async ({ page }) => {
    // 未認証状態をモック（登録ページへのリダイレクトを防ぐ）
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });
  });

  test("登録フォームが表示される", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("#register-username")).toBeVisible();
    await expect(page.locator("#register-email")).toBeVisible();
    await expect(page.locator("#register-password")).toBeVisible();
    await expect(page.locator("#register-password-confirmation")).toBeVisible();
    await expect(page.getByRole("button", { name: "はじめる" })).toBeVisible();
  });

  test("パスワード強度バー：8文字未満では非表示", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-password").fill("abc1");
    await expect(page.getByText("弱い")).not.toBeVisible();
    await expect(page.getByText("普通")).not.toBeVisible();
    await expect(page.getByText("強い")).not.toBeVisible();
  });

  test("パスワード強度バー：英字のみ8文字以上は「弱い」", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-password").fill("abcdefgh");
    await expect(page.getByText("弱い")).toBeVisible();
  });

  test("パスワード強度バー：英字+数字は「普通」", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-password").fill("abcdef12");
    await expect(page.getByText("普通")).toBeVisible();
  });

  test("パスワード強度バー：英字+数字+記号は「強い」", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-password").fill("abcdef1!");
    await expect(page.getByText("強い")).toBeVisible();
  });

  test("パスワード強度バー：12文字以上の英字+数字は「強い」", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-password").fill("abcdefgh1234");
    await expect(page.getByText("強い")).toBeVisible();
  });

  test("パスワード条件チェックリストが表示される", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-password").fill("a");

    await expect(page.getByText("8もじ いじょう")).toBeVisible();
    await expect(page.getByText("えいじ（a〜z）を ふくむ")).toBeVisible();
    await expect(page.getByText("すうじ（0〜9）を ふくむ")).toBeVisible();
  });

  test("空フィールドで送信するとエラーが表示される", async ({ page }) => {
    await page.goto("/register");

    await page.getByRole("button", { name: "はじめる" }).click();

    await expect(page.locator("#error-message")).toContainText(
      "まだ はいっていない ところが あるよ"
    );
  });

  test("利用規約に同意しないと送信できない", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-username").fill("testuser");
    await page.locator("#register-email").fill("test@example.com");
    await page.locator("#register-password").fill("Password1");
    await page.locator("#register-password-confirmation").fill("Password1");
    // 利用規約チェックボックスには触れない

    await page.getByRole("button", { name: "はじめる" }).click();

    await expect(page.locator("#error-message")).toContainText(
      "はじめる まえに、きまりを たしかめてね"
    );
  });

  test("パスワード不一致のときエラーが表示される", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-username").fill("testuser");
    await page.locator("#register-email").fill("test@example.com");
    await page.locator("#register-password").fill("Password1");
    await page.locator("#register-password-confirmation").fill("DifferentPass1");
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: "はじめる" }).click();

    await expect(page.locator("#error-message")).toContainText(
      "パスワードが ちがっているみたい"
    );
  });

  test("不正なメールアドレス形式のときエラーが表示される", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-username").fill("testuser");
    await page.locator("#register-email").fill("not-an-email");
    await page.locator("#register-password").fill("Password1");
    await page.locator("#register-password-confirmation").fill("Password1");
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: "はじめる" }).click();

    await expect(page.locator("#error-message")).toContainText(
      "メールアドレスの かたちを もういちど"
    );
  });

  test("登録成功でホームページに遷移する", async ({ page }) => {
    await page.route("**/auth/register", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 1, email: "new@example.com", username: "newuser" },
        }),
      });
    });

    // 登録後の認証検証（登録直後のリダイレクト先 /home で verify が呼ばれる）
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 1, email: "new@example.com", username: "newuser" },
        }),
      });
    });

    // 夢一覧と感情マスターをモック（/home ページで呼ばれる）
    await page.route("**/dreams**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route("**/emotions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/register");

    await page.locator("#register-username").fill("newuser");
    await page.locator("#register-email").fill("new@example.com");
    await page.locator("#register-password").fill("Password1");
    await page.locator("#register-password-confirmation").fill("Password1");
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: "はじめる" }).click();

    await expect(page).toHaveURL("/home");
  });
});
