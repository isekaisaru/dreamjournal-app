import React from "react";
import { act, render, screen } from "@testing-library/react";
import HomePage from "@/app/home/page";
import type { Dream, DreamProfile } from "@/app/types";

// searchParamsを可変にし、router.pushで書き換えたうえで再レンダーすることで、
// 「プロフィールを素早く切り替えたときの検索パラメータ変化」を模倣する。
let currentSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn((url: string) => {
      const queryString = url.includes("?") ? url.split("?")[1] : "";
      currentSearchParams = new URLSearchParams(queryString);
    }),
    refresh: jest.fn(),
  }),
  useSearchParams: () => currentSearchParams,
}));

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
    { id: 1, name: "A", avatar_emoji: "🐱", color: "#f97316", relationship: "self", active: true, position: 0, archived: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" } as DreamProfile,
    { id: 2, name: "B", avatar_emoji: "🐶", color: "#22c55e", relationship: "child", active: true, position: 1, archived: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" } as DreamProfile,
  ]),
}));

jest.mock("@/app/components/WeeklyDreamNewsWidget", () => ({
  __esModule: true,
  default: () => <div>WeeklyDreamNewsWidget</div>,
}));
jest.mock("@/app/components/MorpheusHero", () => ({ __esModule: true, default: () => <div>MorpheusHero</div> }));
jest.mock("@/app/components/DreamEntryLauncher", () => ({ __esModule: true, default: () => <div>DreamEntryLauncher</div> }));
jest.mock("@/app/components/TrialBanner", () => ({ __esModule: true, default: () => <div>TrialBanner</div> }));
jest.mock("@/app/components/EmailVerificationBanner", () => ({ __esModule: true, default: () => <div>EmailVerificationBanner</div> }));
jest.mock("@/app/components/DreamAdventurePanel", () => ({ __esModule: true, default: () => <div>DreamAdventurePanel</div> }));
jest.mock("@/app/components/forest/ForestPreviewWidget", () => ({ __esModule: true, default: () => <div>ForestPreviewWidget</div> }));
jest.mock("@/app/components/SearchBar", () => ({ __esModule: true, default: () => <div>SearchBar</div> }));
jest.mock("@/app/components/ProfileFilterChips", () => ({ __esModule: true, default: () => <div>ProfileFilterChips</div> }));
jest.mock("@/app/components/DreamList", () => ({
  __esModule: true,
  default: ({ dreams }: { dreams: Dream[] }) => (
    <div data-testid="dream-list-ids">{dreams.map((d) => d.id).join(",")}</div>
  ),
}));
jest.mock("@/app/components/DreamCardSkeleton", () => ({ __esModule: true, DreamListSkeleton: () => <div>DreamListSkeleton</div> }));
jest.mock("@/app/components/DreamStatsWidget", () => ({ __esModule: true, default: () => <div>DreamStatsWidget</div> }));
jest.mock("@/app/components/DreamStreakBadge", () => ({
  __esModule: true,
  default: () => <div>DreamStreakBadge</div>,
  calculateDreamStreak: () => ({ current: 0, longest: 0 }),
}));
jest.mock("@/app/components/MorpheusGuide", () => ({ __esModule: true, MorpheusGuideHome: () => <div>MorpheusGuideHome</div> }));
jest.mock("@/app/components/MorpheusLoginRequired", () => ({ __esModule: true, default: () => <div>MorpheusLoginRequired</div> }));
jest.mock("../../../app/loading", () => ({ __esModule: true, default: () => <div>Loading</div> }));

function dream(id: number): Dream {
  return {
    id,
    title: `夢${id}`,
    userId: 1,
    created_at: "2026-07-10T00:00:00Z",
    updated_at: "2026-07-10T00:00:00Z",
  } as Dream;
}

// URLに応じて手動で解決タイミングを制御できるPromiseを返す
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("HomePage: プロフィール切り替え時のレース条件", () => {
  beforeEach(() => {
    mockGet.mockReset();
    currentSearchParams = new URLSearchParams();
    mockUseAuth.mockReturnValue({
      authStatus: "authenticated",
      user: { id: "1", username: "テストユーザー", premium: true },
    });
  });

  it("プロフィールAの取得が遅延している間にBへ切り替えても、後から届くAの結果でBの表示が上書きされない", async () => {
    const deferredByProfile: Record<string, ReturnType<typeof deferred<Dream[]>>> = {
      "1": deferred<Dream[]>(),
      "2": deferred<Dream[]>(),
    };

    mockGet.mockImplementation((url: string) => {
      if (url.includes("dream_profile_id=1")) return deferredByProfile["1"].promise;
      if (url.includes("dream_profile_id=2")) return deferredByProfile["2"].promise;
      // ニュース専用取得など他の呼び出しは即座に空配列で返す
      return Promise.resolve([]);
    });

    const { rerender } = render(<HomePage />);

    // プロフィールAを選択（1件目のfetchが発火し、まだ解決していない）
    await act(async () => {
      currentSearchParams = new URLSearchParams("dream_profile_id=1");
      rerender(<HomePage />);
    });

    // Aの応答が届く前にプロフィールBへ切り替える（2件目のfetchが発火）
    await act(async () => {
      currentSearchParams = new URLSearchParams("dream_profile_id=2");
      rerender(<HomePage />);
    });

    // Bの応答が先に届く
    await act(async () => {
      deferredByProfile["2"].resolve([dream(200)]);
    });

    // その後、遅れてAの応答が届く（ネットワーク遅延で順序が逆転したケースを模倣）
    await act(async () => {
      deferredByProfile["1"].resolve([dream(100)]);
    });

    // 現在選択中はBのはずなので、画面にはBの夢だけが残っていてほしい
    expect(screen.getByTestId("dream-list-ids")).toHaveTextContent("200");
  });
});
