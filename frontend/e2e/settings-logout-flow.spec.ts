import { expect, test } from "@playwright/test";

for (const width of [375, 390]) {
  test.describe(`設定のログアウト導線 (${width}px)`, () => {
    test.use({ viewport: { width, height: 844 } });

    test("ログアウト後に未認証のログイン画面へ遷移する", async ({ page }) => {
      let loggedOut = false;

      await page.route("**/auth/verify", async (route) => {
        await route.fulfill({
          status: loggedOut ? 401 : 200,
          contentType: "application/json",
          body: JSON.stringify(
            loggedOut
              ? { error: "Unauthorized" }
              : {
                  user: {
                    id: 1,
                    email: "test@example.com",
                    username: "E2Eテスト太郎",
                  },
                }
          ),
        });
      });

      await page.route("**/auth/logout", async (route) => {
        loggedOut = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Logged out" }),
        });
      });

      await page.goto("/settings");
      await page.getByRole("tab", { name: "アカウント" }).click();

      const logoutButton = page.getByRole("button", { name: "ログアウト" });
      await expect(logoutButton).toBeVisible();
      await logoutButton.click();

      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.getByRole("heading", { name: "つづきから" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "ログアウト" })
      ).toHaveCount(0);
    });
  });
}
