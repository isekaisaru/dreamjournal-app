import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomePage from "@/app/home/page";
import type { Dream, DreamProfile } from "@/app/types";

jest.mock("next/navigation", () => {
  // useCallback依存配列の同一性を保つため、URLSearchParamsは1回だけ生成して使い回す
  const searchParams = new URLSearchParams("dream_profile_id=5");
  return {
    useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
    useSearchParams: () => searchParams,
  };
});

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockGet = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: { get: (...args: unknown[]) => mockGet(...args) },
  getEmotions: jest.fn().mockResolvedValue([]),
  getAnalysisQuota: jest
    .fn()
    .mockResolvedValue({ unlimited: true, used: null, limit: null, remaining: null }),
  getDreamProfiles: jest.fn().mockResolvedValue([
    {
      id: 5,
      name: "ねこさん",
      avatar_emoji: "🐱",
      color: "#f97316",
      relationship: "self",
      active: true,
      position: 0,
      archived: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as DreamProfile,
  ]),
}));

jest.mock("@/app/components/WeeklyDreamNewsWidget", () => ({
  __esModule: true,
  default: ({ dreams }: { dreams: Dream[] }) => (
    <div data-testid="weekly-widget-dream-ids">
      {dreams.map((d) => d.id).join(",")}
    </div>
  ),
}));

// このテストで検証しない周辺コンポーネントは軽量なスタブに置き換える
jest.mock("@/app/components/MorpheusHero", () => ({
  __esModule: true,
  default: () => <div>MorpheusHero</div>,
}));
jest.mock("@/app/components/DreamEntryLauncher", () => ({
  __esModule: true,
  default: () => <div>DreamEntryLauncher</div>,
}));
jest.mock("@/app/components/TrialBanner", () => ({
  __esModule: true,
  default: () => <div>TrialBanner</div>,
}));
jest.mock("@/app/components/EmailVerificationBanner", () => ({
  __esModule: true,
  default: () => <div>EmailVerificationBanner</div>,
}));
jest.mock("@/app/components/DreamAdventurePanel", () => ({
  __esModule: true,
  default: () => <div>DreamAdventurePanel</div>,
}));
jest.mock("@/app/components/forest/ForestPreviewWidget", () => ({
  __esModule: true,
  default: () => <div>ForestPreviewWidget</div>,
}));
jest.mock("@/app/components/SearchBar", () => ({
  __esModule: true,
  default: () => <div>SearchBar</div>,
}));
jest.mock("@/app/components/ProfileFilterChips", () => ({
  __esModule: true,
  default: () => <div>ProfileFilterChips</div>,
}));
jest.mock("@/app/components/DreamList", () => ({
  __esModule: true,
  default: ({ viewMode }: { viewMode: string }) => (
    <div>
      DreamList
      <span data-testid="dream-list-view-mode">{viewMode}</span>
    </div>
  ),
}));
jest.mock("@/app/components/DreamCardSkeleton", () => ({
  __esModule: true,
  DreamListSkeleton: () => <div>DreamListSkeleton</div>,
}));
jest.mock("@/app/components/DreamStatsWidget", () => ({
  __esModule: true,
  default: () => <div>DreamStatsWidget</div>,
}));
jest.mock("@/app/components/DreamStreakBadge", () => ({
  __esModule: true,
  default: () => <div>DreamStreakBadge</div>,
  calculateDreamStreak: () => ({ current: 0, longest: 0 }),
}));
jest.mock("@/app/components/MorpheusGuide", () => ({
  __esModule: true,
  MorpheusGuideHome: () => <div>MorpheusGuideHome</div>,
}));
jest.mock("@/app/components/MorpheusLoginRequired", () => ({
  __esModule: true,
  default: () => <div>MorpheusLoginRequired</div>,
}));
jest.mock("../../../app/loading", () => ({
  __esModule: true,
  default: () => <div>Loading</div>,
}));

function dream(id: number): Dream {
  return {
    id,
    title: `夢${id}`,
    userId: 1,
    created_at: "2026-07-10T00:00:00Z",
    updated_at: "2026-07-10T00:00:00Z",
  } as Dream;
}

describe("HomePage: WeeklyDreamNewsWidgetへのデータ受け渡し", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockUseAuth.mockReturnValue({
      authStatus: "authenticated",
      user: { id: "1", username: "テストユーザー", premium: true },
    });
  });

  it("プロフィール絞り込み中でも、フィルターされていない週間データが渡される", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("dream_profile_id=5")) {
        // 通常の夢一覧: プロフィール絞り込みが効いている（1件のみ）
        return Promise.resolve([dream(100)]);
      }
      if (url.includes("start_date=")) {
        // 今週のゆめニュース専用取得: 検索条件なし・日付範囲のみ（複数プロフィール分を含む）
        return Promise.resolve([dream(201), dream(202), dream(203)]);
      }
      return Promise.resolve([]);
    });

    render(<HomePage />);

    const widgetDreamIds = await screen.findByTestId("weekly-widget-dream-ids");
    expect(widgetDreamIds).toHaveTextContent("201,202,203");

    // 通常の夢一覧取得（プロフィール絞り込みあり）とは別に、
    // ニュース専用の取得（dream_profile_idなし・start_dateのみ）が行われたことを確認
    const weeklyNewsCall = mockGet.mock.calls.find(([url]) =>
      String(url).includes("start_date=")
    );
    expect(weeklyNewsCall).toBeDefined();
    expect(String(weeklyNewsCall![0])).not.toContain("dream_profile_id");
  });

  it("ニュース専用取得が失敗しても、ウィジェットを誤表示せずホーム全体は壊れない", async () => {
    // 意図的にニュース専用取得を失敗させるテストのため、console.errorを一時的に抑制する
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    mockGet.mockImplementation((url: string) => {
      if (url.includes("start_date=")) {
        // ニュース専用取得は失敗する
        return Promise.reject(new Error("network error"));
      }
      // 通常の夢一覧取得は成功する（今週の夢を含む）
      return Promise.resolve([dream(300)]);
    });

    render(<HomePage />);

    // 通常のリストは問題なく描画される（ホーム全体は壊れない）
    expect(await screen.findByText("DreamList")).toBeInTheDocument();

    // 通常の夢一覧取得とニュース専用取得の両方が発火し、
    // ニュース専用取得の失敗（reject）が状態に反映されるまで待つ
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    // 「今週は夢がない」という誤表示を避けるため、取得失敗時はウィジェット自体を描画しない
    expect(screen.queryByTestId("weekly-widget-dream-ids")).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("グリッド表示を既定値にし、リスト表示へ切り替えられる", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("start_date=")) return Promise.resolve([dream(201)]);
      return Promise.resolve([dream(100)]);
    });

    render(<HomePage />);

    expect(await screen.findByTestId("dream-list-view-mode")).toHaveTextContent("grid");
    const gridButton = screen.getByRole("button", { name: "グリッド表示" });
    const listButton = screen.getByRole("button", { name: "リスト表示" });
    expect(gridButton).toHaveAttribute("aria-pressed", "true");
    expect(listButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(listButton);

    expect(screen.getByTestId("dream-list-view-mode")).toHaveTextContent("list");
    expect(gridButton).toHaveAttribute("aria-pressed", "false");
    expect(listButton).toHaveAttribute("aria-pressed", "true");
  });
});
