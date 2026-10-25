import { renderHook, act, waitFor } from "@testing-library/react";
import { useDream } from "@/hooks/useDream";
import type { Dream } from "@/app/types";
import apiClient from "@/lib/apiClient";

const stableRouter = { push: jest.fn(), replace: jest.fn(), refresh: jest.fn() };
jest.mock("next/navigation", () => ({
  useRouter: () => stableRouter,
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

function dream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "夢A",
    userId: 1,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    ...overrides,
  } as Dream;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("useDream: 夢の詳細ページでdreamIdを素早く切り替えたときのレース条件", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockUseAuth.mockReturnValue({ authStatus: "authenticated", isLoggedIn: true });
  });

  it("夢1の取得が遅延している間に夢2へ切り替えても、後から届く1の結果で2の表示が上書きされない", async () => {
    const dreamsDeferred: Record<string, ReturnType<typeof deferred<Dream>>> = {
      "1": deferred<Dream>(),
      "2": deferred<Dream>(),
    };

    mockedGet.mockImplementation((url: string) => {
      const match = url.match(/\/dreams\/(\d+)/);
      const id = match ? match[1] : "";
      return dreamsDeferred[id].promise as any;
    });

    const { result, rerender } = renderHook(({ id }) => useDream(id), {
      initialProps: { id: "1" as string | undefined },
    });

    rerender({ id: "2" });

    // 夢2の応答が先に届く
    await act(async () => {
      dreamsDeferred["2"].resolve(dream({ id: 2, title: "夢B" }));
    });

    // その後、遅れて夢1の応答が届く（ネットワーク遅延で順序が逆転したケースを模倣）
    await act(async () => {
      dreamsDeferred["1"].resolve(dream({ id: 1, title: "夢A" }));
    });

    // 現在開いているのは夢2のはずなので、表示は「夢B」であってほしい
    await waitFor(() => expect(result.current.dream?.title).toBe("夢B"));
  });
});
