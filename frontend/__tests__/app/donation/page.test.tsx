import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import DonationPage from "@/app/donation/page";

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

function jsonResponse(status: number, body: object): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn<() => Promise<object>>().mockResolvedValue(body),
  } as unknown as Response;
}

function clickDonate() {
  fireEvent.click(screen.getByRole("button", { name: "500円で応援する" }));
}

describe("DonationPage: Checkoutのメール確認エラー", () => {
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

    render(<DonationPage />);
    clickDonate();

    expect(
      await screen.findByText("おうえんするには メールの かくにんが ひつようだよ")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    ).toBeInTheDocument();
    expect(
      screen.queryByText("決済ページの準備に失敗しました。")
    ).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("/api/checkout", { method: "POST" });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "500円で応援する" })
      ).toBeEnabled();
    });
  });

  it("email_verification_requiredのない403では従来どおり汎用エラーを表示する", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(403, {
        error: "不正なリクエスト元からの操作は許可されていません。",
      })
    );

    render(<DonationPage />);
    clickDonate();

    expect(
      await screen.findByText("決済ページの準備に失敗しました。")
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("メールアドレス確認のお知らせ")
    ).not.toBeInTheDocument();
  });

  it("一般的なAPIエラーでは従来どおり汎用エラーを表示する", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(500, { error: "FRONTEND_URLが設定されていません。" })
    );

    render(<DonationPage />);
    clickDonate();

    expect(
      await screen.findByText("決済ページの準備に失敗しました。")
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("メールアドレス確認のお知らせ")
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "500円で応援する" })
      ).toBeEnabled();
    });
  });
});

// 500円の応援と、月590円のプレミアムを見くらべる人が、寄付でも機能が増えると思わないようにする（2026-11-25）。
describe("DonationPage: 寄付とプレミアムのちがい", () => {
  it("支払う前に、1回だけの応援で機能は増えないことと、プレミアムの入口を出す", () => {
    render(<DonationPage />);

    expect(
      screen.getByText(/1回だけの おうえんです。プレミアムの きのうは ふえません/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "プレミアムプランを見る" })
    ).toHaveAttribute("href", "/subscription");
  });
});
