import { act, render } from "@testing-library/react";
import PendingDreamsMonitor from "@/app/components/PendingDreamsMonitor";
import apiClient from "@/lib/apiClient";

// 分析待ちの夢の状態は /api/dreams/statuses にまとめて問い合わせる。
// 中継と Rails は一度に 100 件までしか受けつけないので、
// 分析待ちが 100 件をこえても、100 件ずつに分けて問い合わせる。
jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ authStatus: "authenticated" }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const fetchMock = jest.fn<typeof fetch>();

describe("PendingDreamsMonitor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("分析待ちが 100 件をこえたら、100 件ずつに分けて問い合わせる", async () => {
    const dreams = Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      analysis_status: "pending",
    }));
    (apiClient.get as jest.Mock).mockResolvedValue(dreams);

    render(<PendingDreamsMonitor />);
    // 分析待ちの一覧を読みこむ
    await act(async () => {});
    // 最初の問い合わせ（5 秒ごと）
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const counts = fetchMock.mock.calls.map(([url]) => {
      const ids = new URL(String(url), "http://localhost").searchParams.get("ids") ?? "";
      return ids.split(",").length;
    });
    expect(counts).toEqual([100, 50]);
  });
});
