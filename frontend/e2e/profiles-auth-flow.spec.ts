import { expect, test } from "@playwright/test";

const AUTHENTICATED_USER = {
  id: 1,
  email: "test@example.com",
  username: "E2Eテスト太郎",
};

const DREAM_PROFILES = [
  {
    id: 1,
    name: "自分",
    avatar_emoji: "😴",
    color: "#6366f1",
    relationship: "self",
    active: true,
    position: 0,
    archived: false,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
];

test("認証済みなら設定からプロフィール管理へ遷移できる", async ({ page }) => {
  await page.route("**/auth/verify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: AUTHENTICATED_USER }),
    });
  });
  await page.route("**/dream_profiles", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DREAM_PROFILES),
    });
  });

  await page.goto("/settings");
  await page.getByRole("link", { name: /プロフィールを管理する/ }).click();

  await expect(page).toHaveURL(/\/profiles$/);
  await expect(
    page.getByRole("heading", { name: "夢プロフィール" })
  ).toBeVisible();
  await expect(page.getByText("自分", { exact: true }).first()).toBeVisible();
});

test("認証確認中も /profiles に留まり、確認後に表示する", async ({ page }) => {
  await page.route("**/auth/verify", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: AUTHENTICATED_USER }),
    });
  });
  await page.route("**/dream_profiles", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(DREAM_PROFILES),
    });
  });

  await page.goto("/profiles");
  await expect(page).toHaveURL(/\/profiles$/);
  await expect(
    page.getByRole("heading", { name: "夢プロフィール" })
  ).toBeVisible();
  await expect(page).not.toHaveURL(/\/home$/);
});

test("未認証の /profiles 直リンクは /login へ遷移する", async ({ page }) => {
  await page.route("**/auth/verify", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unauthorized" }),
    });
  });
  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unauthorized" }),
    });
  });

  await page.goto("/profiles");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "つづきから" })).toBeVisible();
});
