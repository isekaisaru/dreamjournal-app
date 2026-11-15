import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DreamByMonthPage from "@/app/dream/month/[yearMonth]/page";

jest.mock("next/navigation", () => ({
  useParams: () => ({ yearMonth: "2026-04" }),
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    authStatus: "authenticated",
    user: {
      id: "1",
      email: "dreamer@example.com",
      premium: true,
    },
  }),
}));

const mockGet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockResendVerificationEmail =
  jest.fn<(...args: unknown[]) => Promise<{ message: string }>>();
const mockFetch = jest.fn<typeof fetch>();

jest.mock("@/lib/apiClient", () => {
  class MockApiError extends Error {}

  return {
    __esModule: true,
    default: { get: (...args: unknown[]) => mockGet(...args) },
    ApiError: MockApiError,
    resendVerificationEmail: (...args: unknown[]) =>
      mockResendVerificationEmail(...args),
  };
});

jest.mock("@/app/components/DreamList", () => ({
  __esModule: true,
  default: () => <div>DreamList</div>,
}));
jest.mock("@/app/components/DreamCardSkeleton", () => ({
  DreamListSkeleton: () => <div>DreamListSkeleton</div>,
}));
jest.mock("@/app/components/MorpheusAvatar", () => ({
  __esModule: true,
  default: () => <div>MorpheusAvatar</div>,
}));
jest.mock("@/app/components/MoodCalendar", () => ({
  __esModule: true,
  default: () => <div>MoodCalendar</div>,
}));
jest.mock("@/app/components/EmotionTag", () => ({
  EmotionTag: ({ label }: { label: string }) => <span>{label}</span>,
  getChildFriendlyEmotionLabel: (label: string) => label,
}));
jest.mock("@/app/components/MorpheusLoginRequired", () => ({
  __esModule: true,
  default: () => <div>MorpheusLoginRequired</div>,
}));
jest.mock("@/app/loading", () => ({
  __esModule: true,
  default: () => <div>Loading</div>,
}));

const dream = {
  id: 1,
  title: "空を飛ぶ夢",
  userId: 1,
  created_at: "2026-04-10T00:00:00.000Z",
  updated_at: "2026-04-10T00:00:00.000Z",
};

function jsonResponse(status: number, body: object): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn<() => Promise<object>>().mockResolvedValue(body),
  } as unknown as Response;
}

async function renderPageAndGenerate() {
  render(<DreamByMonthPage />);
  await screen.findByText("DreamList");
  fireEvent.click(
    screen.getByRole("button", { name: "✨ AIサマリーを生成する" })
  );
}

describe("DreamByMonthPage: AIサマリーのメール確認エラー", () => {
  beforeAll(() => {
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: mockFetch,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockGet.mockResolvedValue([dream]);
    mockResendVerificationEmail.mockResolvedValue({ message: "sent" });
  });

  it("未確認ユーザーへの403では確認案内と再送信導線を表示する", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(403, {
        error: "メールアドレスの確認が必要です。",
        email_verification_required: true,
      })
    );

    await renderPageAndGenerate();

    expect(
      await screen.findByText("AIサマリーには メールの かくにんが ひつようだよ")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    ).toBeInTheDocument();
    expect(screen.queryByText("メールアドレスの確認が必要です。"))
      .not.toBeInTheDocument();
  });

  it("確認済みユーザーの成功レスポンスではAIサマリーを表示する", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, { summary: "今月は楽しい夢が多かったね。" })
    );

    await renderPageAndGenerate();

    expect(
      await screen.findByText("今月は楽しい夢が多かったね。")
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("メールアドレス確認のお知らせ")
    ).not.toBeInTheDocument();
  });

  it("一般的なAPIエラーでは従来どおりエラーメッセージを表示する", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(500, { error: "サーバーでエラーが発生しました。" })
    );

    await renderPageAndGenerate();

    expect(
      await screen.findByText("サーバーでエラーが発生しました。")
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("メールアドレス確認のお知らせ")
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "✨ AIサマリーを生成する" })
      ).toBeEnabled();
    });
  });
});
