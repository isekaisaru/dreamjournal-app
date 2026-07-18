import { renderHook, waitFor } from "@testing-library/react";
import { useRecentDream } from "@/hooks/useRecentDream";
import type { Dream } from "@/app/types";
import { getDreamsForProfile } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({
  getDreamsForProfile: jest.fn(),
}));

const mockedGetDreamsForProfile = getDreamsForProfile as jest.MockedFunction<
  typeof getDreamsForProfile
>;

function dream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "古い木のゆめ",
    userId: 1,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    emotions: [{ id: 1, name: "喜び" }],
    ...overrides,
  };
}

describe("useRecentDream", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it("正常な応答から最初の夢を返す", async () => {
    mockedGetDreamsForProfile.mockResolvedValueOnce([dream({ title: "空飛ぶ夢" })]);

    const { result } = renderHook(({ id }) => useRecentDream(id), {
      initialProps: { id: 1 as number | null },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentDream?.title).toBe("空飛ぶ夢");
  });

  it("profileIdがnullのときは何も取得しない", () => {
    const { result } = renderHook(() => useRecentDream(null));

    expect(result.current.recentDream).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(mockedGetDreamsForProfile).not.toHaveBeenCalled();
  });

  it("プロフィール切替後に失敗しても、前のプロフィールの直近の夢は残さない", async () => {
    mockedGetDreamsForProfile
      .mockResolvedValueOnce([dream({ title: "前の木のゆめ" })])
      .mockRejectedValueOnce(new Error("temporary failure"));

    const { result, rerender } = renderHook(({ id }) => useRecentDream(id), {
      initialProps: { id: 1 as number | null },
    });

    await waitFor(() => expect(result.current.recentDream?.title).toBe("前の木のゆめ"));

    rerender({ id: 2 });

    await waitFor(() => expect(mockedGetDreamsForProfile).toHaveBeenCalledWith(2));
    await waitFor(() => expect(result.current.recentDream).toBeNull());
  });

  it("配列でない応答は無視してクラッシュしない", async () => {
    mockedGetDreamsForProfile.mockResolvedValueOnce({ error: "bad response" } as any);

    const { result } = renderHook(({ id }) => useRecentDream(id), {
      initialProps: { id: 1 as number | null },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentDream).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unexpected dreams response for tree preview sheet",
      { error: "bad response" }
    );
  });
});
