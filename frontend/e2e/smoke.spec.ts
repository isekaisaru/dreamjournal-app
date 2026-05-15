import { test, expect } from "@playwright/test";

test("Smoke Test: App loads and shows login page", async ({ page }) => {
  // 1. Navigate to home
  await page.goto("/");

  // 2. Check title
  await expect(page).toHaveTitle(
    /YumeTree|AI夢ノート/i
  );

  // 3. Verify Login functionality is accessible
  const loginButton = page.getByRole("button", { name: /ログイン|Login/i });
  const loginLink = page.getByRole("link", { name: /ログイン|Login/i });

  await expect(loginButton.or(loginLink).first()).toBeVisible();
});
