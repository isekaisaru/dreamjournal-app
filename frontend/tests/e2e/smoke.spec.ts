import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");

    // ページボディが可視であることを確認
    await expect(page.locator("body")).toBeVisible();

    // ページタイトルに「ユメログ」が含まれることを確認
    await expect(page).toHaveTitle(/夢の記録アプリケーション/);

    // 主要な見出し(h1)が表示され、期待したテキストを持っていることを確認
    const mainHeading = page.getByRole("heading", { level: 1 });
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toHaveText(/ユメログ/);
  });

  test("navigation is accessible", async ({ page }) => {
    await page.goto("/");

    // ナビゲーションが表示され、期待されるリンクが含まれていることを確認
    const navigation = page.getByRole("navigation");
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "ログイン" })
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "ユーザー登録" })
    ).toBeVisible();
  });
});
