import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import VerifyEmailPage from "@/app/verify-email/page";
import { verifyEmail } from "@/lib/apiClient";

// useSearchParams の返す token をテストごとに切り替える
let mockToken: string | null = null;
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "token" ? mockToken : null),
  }),
}));

jest.mock("@/lib/apiClient", () => ({
  verifyEmail: jest.fn(),
}));

const mockVerifyEmail = verifyEmail as jest.Mock;

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = null;
  });

  it("トークンがない場合はエラー表示になる", () => {
    render(<VerifyEmailPage />);
    expect(screen.getByText("かくにん できなかったよ")).toBeInTheDocument();
    expect(mockVerifyEmail).not.toHaveBeenCalled();
  });

  it("検証に成功すると成功メッセージとホームへのリンクを表示する", async () => {
    mockToken = "valid-token";
    mockVerifyEmail.mockResolvedValue({
      message: "メールアドレスを確認しました",
      email_verified: true,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("かくにん できたよ！")).toBeInTheDocument();
    });
    expect(mockVerifyEmail).toHaveBeenCalledWith("valid-token");
    expect(screen.getByRole("link", { name: "ホームへ すすむ" })).toHaveAttribute(
      "href",
      "/home"
    );
  });

  it("検証に失敗するとエラーメッセージと設定へのリンクを表示する", async () => {
    mockToken = "expired-token";
    mockVerifyEmail.mockRejectedValue(new Error("422"));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText("かくにん できなかったよ")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "せっていへ いく" })).toHaveAttribute(
      "href",
      "/settings"
    );
  });
});
