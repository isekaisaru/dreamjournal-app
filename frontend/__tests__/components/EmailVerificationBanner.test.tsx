import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailVerificationBanner from "@/app/components/EmailVerificationBanner";
import { resendVerificationEmail, ApiError } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => {
  class ApiError extends Error {
    status!: number;
  }
  return {
    resendVerificationEmail: jest.fn(),
    ApiError,
  };
});

const mockResend = resendVerificationEmail as jest.Mock;

describe("EmailVerificationBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("メール未確認のお知らせと再送ボタンを表示する", () => {
    render(<EmailVerificationBanner />);

    expect(
      screen.getByText("メールアドレスの かくにんが まだだよ")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    ).toBeInTheDocument();
  });

  it("title / description を文脈に合わせて差し替えられる", () => {
    render(
      <EmailVerificationBanner
        title="AIぶんせきには メールの かくにんが ひつようだよ"
        description="とどいた メールの リンクを ひらいてから、もういちど きいてみてね。"
      />
    );

    expect(
      screen.getByText("AIぶんせきには メールの かくにんが ひつようだよ")
    ).toBeInTheDocument();
    expect(
      screen.getByText("とどいた メールの リンクを ひらいてから、もういちど きいてみてね。")
    ).toBeInTheDocument();
  });

  it("再送ボタンを押すと送信中表示になり、成功したら完了メッセージに切り替わる", async () => {
    const user = userEvent.setup();
    mockResend.mockResolvedValue({ message: "確認メールを送りました" });

    render(<EmailVerificationBanner />);
    await user.click(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("かくにんメールを おくったよ。うけとりボックスを みてね。")
      ).toBeInTheDocument();
    });
    expect(mockResend).toHaveBeenCalledTimes(1);
  });

  it("送信に失敗したらエラーメッセージを表示し、再送ボタンに戻る", async () => {
    const user = userEvent.setup();
    const error = new ApiError("確認メールを送信済みです。少し待ってからもう一度お試しください。");
    error.status = 429;
    mockResend.mockRejectedValue(error);

    render(<EmailVerificationBanner />);
    await user.click(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("確認メールを送信済みです。少し待ってからもう一度お試しください。")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    ).toBeInTheDocument();
  });
});
