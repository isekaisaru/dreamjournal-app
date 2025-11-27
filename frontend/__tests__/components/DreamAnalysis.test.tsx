import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DreamAnalysis from "@/app/components/DreamAnalysis";

// apiClientはdefault exportなので、__esModule: true と default を使ってモックします
jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import apiClient from "@/lib/apiClient";
// 型安全なモックのためのキャスト
const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetAllMocks();
  mockedApi.get.mockResolvedValue({
    status: null,
    result: null,
    analyzed_at: null,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

it("loads initial status and shows done result", async () => {
  mockedApi.get.mockResolvedValueOnce({
    status: "done",
    result: { text: "Initial analysis result." },
    analyzed_at: "2023-01-01T12:00:00Z",
  });

  render(<DreamAnalysis dreamId="1" hasContent={true} />);

  expect(await screen.findByText("--- AIによる夢の分析 ---")).toBeInTheDocument();
  expect(screen.getByText("Initial analysis result.")).toBeInTheDocument();
});

it("starts analysis, shows pending, then shows done result", async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  // 1) 初期は未解析 (エラーにして強制的にnull状態にする)
  mockedApi.get.mockRejectedValueOnce(new Error("Initial check failed"));
  // 2) 解析開始のPOST（ボディなし想定）
  mockedApi.post.mockResolvedValueOnce(null);
  // 3) 最初のポーリング: pending
  mockedApi.get.mockResolvedValueOnce({
    status: "pending",
    result: null,
    analyzed_at: null,
  });
  // 4) 次のポーリング: done
  mockedApi.get.mockResolvedValueOnce({
    status: "done",
    result: { text: "Analysis complete!" },
    analyzed_at: "2023-01-01T12:00:00Z",
  });

  render(<DreamAnalysis dreamId="1" hasContent={true} />);
  await user.click(
    await screen.findByRole("button", { name: "もう一度分析する" })
  );

  // ボタンが押され、ポーリングが開始されると "pending" 状態のテキストが表示されるのを待つ
  await waitFor(() => {
    expect(
      screen.getByText("分析結果を取得中です。しばらくお待ちください...")
    ).toBeInTheDocument();
  });

  // ポーリング分の時間を進める
  jest.advanceTimersByTime(3000); // 1回目poll
  jest.advanceTimersByTime(3000); // 2回目poll

  // 最終的に完了の結果が表示されるのを待つ
  expect(await screen.findByText("Analysis complete!")).toBeInTheDocument();
});

it("starts analysis, shows pending, then shows failed result", async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  mockedApi.get.mockRejectedValueOnce(new Error("Initial check failed"));
  mockedApi.post.mockResolvedValueOnce(null);
  mockedApi.get.mockResolvedValueOnce({
    status: "pending",
    result: null,
    analyzed_at: null,
  });
  mockedApi.get.mockResolvedValueOnce({
    status: "failed",
    result: { error: "Something went wrong." },
    analyzed_at: "2023-01-01T12:00:00Z",
  });

  render(<DreamAnalysis dreamId="1" hasContent={true} />);
  await user.click(
    await screen.findByRole("button", { name: "もう一度分析する" })
  );

  // "pending" 状態のテキストが表示されるのを待つ
  await waitFor(() => {
    expect(
      screen.getByText("分析結果を取得中です。しばらくお待ちください...")
    ).toBeInTheDocument();
  });

  // ポーリング分の時間を進める
  jest.advanceTimersByTime(3000);
  jest.advanceTimersByTime(3000);

  // 最終的に失敗の結果が表示されるのを待つ
  expect(await screen.findByText("分析失敗")).toBeInTheDocument();
  expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
});
