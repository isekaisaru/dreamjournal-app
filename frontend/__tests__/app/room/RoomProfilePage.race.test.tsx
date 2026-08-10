import React from "react";
import { act, render, screen } from "@testing-library/react";
import DreamRoomPage from "@/app/room/[profileId]/page";
import type { Dream, DreamProfile } from "@/app/types";

// useParamsを可変にし、値を書き換えたうえで再レンダーすることで、
// 「別のプロフィールの部屋へ素早く切り替えたときのパラメータ変化」を模倣する。
let currentProfileId = "1";
// loadRoomの依存配列にrouterが含まれるため、モックが毎回新しいオブジェクトを返すと
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
  default: { get: jest.fn() },
  getDreamProfiles: (...args: unknown[]) => mockGetDreamProfiles(...args),
  getDreamsForProfile: (...args: unknown[]) => mockGetDreamsForProfile(...args),
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("DreamRoomPage: プロフィールの部屋を素早く切り替えたときのレース条件", () => {
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

    const { rerender } = render(<DreamRoomPage />);

    // プロフィール1の部屋を開く（1件目のfetchが発火し、まだ解決していない）
    await act(async () => {
      currentProfileId = "1";
      rerender(<DreamRoomPage />);
    });

    // 1の応答が届く前にプロフィール2の部屋へ切り替える（2件目のfetchが発火）
    await act(async () => {
      currentProfileId = "2";
      rerender(<DreamRoomPage />);
    });

    // 2の応答が先に届く（夢は0件でRoomEmptyState分岐に入る）
    await act(async () => {
      dreamsDeferred["2"].resolve([]);
    });

    // その後、遅れて1の応答が届く（ネットワーク遅延で順序が逆転したケースを模倣）
    await act(async () => {
      dreamsDeferred["1"].resolve([]);
    });

    // 現在開いているのはプロフィール2の部屋のはずなので、見出しは「じろう」であってほしい
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("じろう");
  });
});
