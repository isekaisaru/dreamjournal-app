import { test, expect } from "@playwright/test";

// 夢の森用のモックデータ（dreams_count を含む）
const MOCK_DREAM_PROFILES = [
  {
    id: 1,
    name: "自分",
    avatar_emoji: "😴",
    color: "#6366f1",
    relationship: "self",
    active: true,
    position: 0,
    archived: false,
    dreams_count: 14,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 2,
    name: "モカ",
    avatar_emoji: "🐱",
    color: "#10b981",
    relationship: "pet",
    active: true,
    position: 1,
    archived: false,
    dreams_count: 3,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
];

const MOCK_DREAMS = [
  {
    id: 10,
    title: "空飛ぶ夢",
    content: "大空を自由に飛んでいた。",
    dream_profile_id: 1,
    created_at: "2026-03-15T10:00:00Z",
    emotions: [{ id: 1, name: "喜び" }],
    analysis_status: "done",
  },
  {
    id: 9,
    title: "海の夢",
    content: "深い海を泳いでいた。",
    dream_profile_id: 1,
    created_at: "2026-02-20T10:00:00Z",
    emotions: [{ id: 2, name: "安心" }],
    analysis_status: "pending",
  },
];

test.describe("夢の森", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/auth/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 1, email: "test@example.com", username: "E2Eテスト太郎" },
        }),
      });
    });

    await page.route("**/dream_profiles", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DREAM_PROFILES),
      });
    });

    // /dreams も /dreams?dream_profile_id=1 もこのルートで返す
    await page.route("**/dreams**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DREAMS),
      });
    });

    await page.route("**/emotions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: 1, name: "喜び" },
          { id: 2, name: "安心" },
        ]),
      });
    });

    await page.context().addCookies([
      { name: "access_token", value: "fake-e2e-token", url: "http://localhost:3000" },
      { name: "__e2e__", value: "1", url: "http://localhost:3000" },
    ]);
  });

  test("森 → 木 → へ遷移できる", async ({ page }) => {
    await page.goto("/forest");

    await expect(
      page.getByRole("heading", { name: "ゆめの もり" })
    ).toBeVisible();

    // 「自分」の木をクリック（aria-label の前方一致で絞り込み）
    await page.getByRole("button", { name: /自分 の木/ }).first().click();

    await expect(page).toHaveURL(/\/forest\/1$/);
    await expect(page.getByRole("heading", { name: /の き$/ })).toBeVisible();
  });
});
