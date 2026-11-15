import React from "react";
import { act, render, screen } from "@testing-library/react";
import ForestProfilePage from "@/app/forest/[profileId]/page";
import type { Dream, DreamProfile } from "@/app/types";

// useParamsを可変にし、値を書き換えたうえで再レンダーすることで、
// 「別のプロフィール詳細ページへ素早く切り替えたときのパラメータ変化」を模倣する。
let currentProfileId = "1";
// load()の依存配列にrouterが含まれるため、モックが毎回新しいオブジェクトを返すと
// useCallbackの同一性が壊れて無限に再fetchし続けてしまう。安定した参照を1つだけ使い回す。
const stableRouter = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn() };

jest.mock("next/navigation", () => ({
  useParams: () => ({ profileId: currentProfileId }),
  useRouter: () => stableRouter,
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

const mockGetDreamProfiles = jest.fn();
const mockGetDreamsForProfile = jest.fn();
jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  getDreamProfiles: (...args: unknown[]) => mockGetDreamProfiles(...args),
  getDreamsForProfile: (...args: unknown[]) => mockGetDreamsForProfile(...args),
}));

jest.mock("@/app/components/forest/ForestTree", () => ({
  __esModule: true,
  default: () => <div>ForestTree</div>,
}));
jest.mock("@/app/components/forest/PastDreamsList", () => ({
  __esModule: true,
  default: () => <div>PastDreamsList</div>,
}));
jest.mock("@/app/components/forest/ForestGuide", () => ({
  __esModule: true,
  default: () => <div>ForestGuide</div>,
}));
jest.mock("@/app/components/forest/SeasonalParticles", () => ({
  __esModule: true,
  default: () => <div>SeasonalParticles</div>,
}));
jest.mock("@/app/components/forest/FruitLegend", () => ({
  __esModule: true,
  default: () => <div>FruitLegend</div>,
}));
jest.mock("@/app/components/forest/ParticleField", () => ({
  __esModule: true,
  default: () => <div>ParticleField</div>,
}));
jest.mock("@/app/loading", () => ({
  __esModule: true,
  default: () => <div>Loading</div>,
}));

function profile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "自分",
    avatar_emoji: "😴",
    color: "#6366f1",
    relationship: "self",
    active: true,
    position: 0,
    archived: false,
    created_at: "2026-06-24T00:00:00Z",
    updated_at: "2026-06-24T00:00:00Z",
    ...overrides,
  } as DreamProfile;
}

function dream(id: number): Dream {
  return {
    id,
    title: `夢${id}`,
    userId: 1,
    created_at: "2026-06-24T00:00:00Z",
    updated_at: "2026-06-24T00:00:00Z",
  } as Dream;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("ForestProfilePage: プロフィール詳細ページを素早く切り替えたときのレース条件", () => {
  beforeEach(() => {
    mockGetDreamProfiles.mockReset();
    mockGetDreamsForProfile.mockReset();
    currentProfileId = "1";
    mockUseAuth.mockReturnValue({ authStatus: "authenticated" });
  });

  it("プロフィール1の取得が遅延している間にプロフィール2へ切り替えても、後から届く1の結果で2の表示が上書きされない", async () => {
    const profiles = [profile({ id: 1, name: "いちろう" }), profile({ id: 2, name: "じろう" })];
    const dreamsDeferred: Record<string, ReturnType<typeof deferred<Dream[]>>> = {
      "1": deferred<Dream[]>(),
      "2": deferred<Dream[]>(),
    };

    mockGetDreamProfiles.mockResolvedValue(profiles);
    mockGetDreamsForProfile.mockImplementation((profileId: number) => {
      return dreamsDeferred[String(profileId)].promise;
    });

    const { rerender } = render(<ForestProfilePage />);

    // プロフィール1の詳細を開く（1件目のfetchが発火し、まだ解決していない）
    await act(async () => {
      currentProfileId = "1";
      rerender(<ForestProfilePage />);
    });

    // 1の応答が届く前にプロフィール2の詳細へ切り替える（2件目のfetchが発火）
    await act(async () => {
      currentProfileId = "2";
      rerender(<ForestProfilePage />);
    });

    // 2の応答が先に届く
    await act(async () => {
      dreamsDeferred["2"].resolve([dream(200)]);
    });

    // その後、遅れて1の応答が届く（ネットワーク遅延で順序が逆転したケースを模倣）
    await act(async () => {
      dreamsDeferred["1"].resolve([dream(100)]);
    });

    // 現在開いているのはプロフィール2の詳細のはずなので、見出しは「じろう」であってほしい
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("じろう");
  });
});
