import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import SubscriptionPage from "@/app/subscription/page";

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    authStatus: "authenticated",
    user: {
      id: "1",
      email: "dreamer@example.com",
      premium: false,
    },
  }),
}));

const mockResendVerificationEmail =
  jest.fn<(...args: unknown[]) => Promise<{ message: string }>>();
const mockFetch = jest.fn<typeof fetch>();

jest.mock("@/lib/apiClient", () => {
  class MockApiError extends Error {}

  return {
    __esModule: true,
    ApiError: MockApiError,
    resendVerificationEmail: (...args: unknown[]) =>
      mockResendVerificationEmail(...args),
  };
});

jest.mock("@/app/components/MorpheusSmall", () => ({
  __esModule: true,
  default: () => <div>MorpheusSmall</div>,
}));
jest.mock("@/app/components/MorpheusHero", () => ({
  __esModule: true,
  default: () => <div>MorpheusHero</div>,
}));
jest.mock("@/app/components/MorpheusLoginRequired", () => ({
  __esModule: true,
  default: () => <div>MorpheusLoginRequired</div>,
}));
jest.mock("@/app/loading", () => ({
  __esModule: true,
  default: () => <div>Loading</div>,
}));

function jsonResponse(status: number, body: object): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn<() => Promise<object>>().mockResolvedValue(body),
  } as unknown as Response;
}

function clickSubscribe() {
  fireEvent.click(screen.getByRole("button", { name: "プレミアムを始める" }));
}

describe("SubscriptionPage: Checkoutのメール確認エラー", () => {
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
    mockResendVerificationEmail.mockResolvedValue({ message: "sent" });
  });

  it("未確認ユーザーへの403では確認案内と再送信導線を表示する", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(403, {
        error: "メールアドレスの確認が必要です。",
        email_verification_required: true,
      })
    );

    render(<SubscriptionPage />);
    clickSubscribe();

    expect(
      await screen.findByText(
        "プレミアムに とうろくするには メールの かくにんが ひつようだよ"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("決済ページの準備に失敗しました。")
    ).not.toBeInTheDocument();
    // リクエスト内容（premium プラン指定）は従来どおり
    expect(mockFetch).toHaveBeenCalledWith("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "premium" }),
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "プレミアムを始める" })
      ).toBeEnabled();
    });
  });

  it("email_verification_requiredのない403では従来どおり汎用エラーを表示する", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(403, {
        error: "不正なリクエスト元からの操作は許可されていません。",
      })
    );

    render(<SubscriptionPage />);
    clickSubscribe();

    expect(
      await screen.findByText("決済ページの準備に失敗しました。")
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("メールアドレス確認のお知らせ")
    ).not.toBeInTheDocument();
  });

  it("一般的なAPIエラーでは従来どおり汎用エラーを表示する", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(500, { error: "プレミアム決済の設定が未完了です。" })
    );

    render(<SubscriptionPage />);
    clickSubscribe();

    expect(
      await screen.findByText("決済ページの準備に失敗しました。")
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("メールアドレス確認のお知らせ")
    ).not.toBeInTheDocument();
  });
});
