import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";

import PasswordResetPage from "@/app/(auth)/password-reset/[token]/page";
import { confirmPasswordReset, ApiError } from "@/lib/apiClient";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@/lib/apiClient", () => {
  class MockApiError extends Error {
    status = 0;
  }
  return {
    __esModule: true,
    confirmPasswordReset: jest.fn(),
    ApiError: MockApiError,
  };
});

const mockedUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockedConfirmPasswordReset =
  confirmPasswordReset as jest.MockedFunction<typeof confirmPasswordReset>;

const fillPasswords = (password: string, confirmation: string) => {
  fireEvent.change(
    document.getElementById("reset-password") as HTMLInputElement,
    { target: { value: password } }
  );
  fireEvent.change(
    document.getElementById(
      "reset-password-confirmation"
    ) as HTMLInputElement,
    { target: { value: confirmation } }
  );
};

const submit = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "パスワードを変更する" })
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseParams.mockReturnValue({
    token: "abc123token",
  } as ReturnType<typeof useParams>);
});

describe("PasswordResetPage", () => {
  it("URLのtokenと入力値でPATCH /password_resets/:tokenを呼ぶ", async () => {
    mockedConfirmPasswordReset.mockResolvedValue({ message: "ok" });
    render(<PasswordResetPage />);

    fillPasswords("newpass123", "newpass123");
    submit();

    await waitFor(() => {
      expect(mockedConfirmPasswordReset).toHaveBeenCalledWith(
        "abc123token",
        { password: "newpass123", password_confirmation: "newpass123" }
      );
    });
  });

  it("成功時は成功メッセージとログイン画面へのリンクを表示する", async () => {
    mockedConfirmPasswordReset.mockResolvedValue({ message: "ok" });
    render(<PasswordResetPage />);

    fillPasswords("newpass123", "newpass123");
    submit();

    expect(
      await screen.findByText(/パスワードを変更しました/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "ログイン画面へ" })
    ).toHaveAttribute("href", "/login");
  });

  it("パスワードが一致しない場合はAPIを呼ばずエラーを表示する", async () => {
    render(<PasswordResetPage />);

    fillPasswords("newpass123", "different123");
    submit();

    expect(
      await screen.findByText(
        "パスワードが ちがっているみたい。もういちど みてみよう。"
      )
    ).toBeInTheDocument();
    expect(mockedConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it("パスワードが8文字未満の場合はAPIを呼ばずエラーを表示する", async () => {
    render(<PasswordResetPage />);

    fillPasswords("short1", "short1");
    submit();

    expect(
      await screen.findByText("パスワードは 8もじ いじょうで いれてね。")
    ).toBeInTheDocument();
    expect(mockedConfirmPasswordReset).not.toHaveBeenCalled();
  });

  it("バックエンドが無効・期限切れトークンのエラーを返したらそのメッセージを表示する", async () => {
    mockedConfirmPasswordReset.mockRejectedValue(
      new ApiError("無効または期限切れのトークンです。")
    );
    render(<PasswordResetPage />);

    fillPasswords("newpass123", "newpass123");
    submit();

    expect(
      await screen.findByText("無効または期限切れのトークンです。")
    ).toBeInTheDocument();
  });

  it("URLにtokenが無い場合は送信ボタンがdisabledでエラー案内を表示する", () => {
    mockedUseParams.mockReturnValue({} as ReturnType<typeof useParams>);
    render(<PasswordResetPage />);

    expect(
      screen.getByRole("button", { name: "パスワードを変更する" })
    ).toBeDisabled();
    expect(
      screen.getByText(
        "リンクが正しくないみたい。もう一度メールのリンクを確認してね。"
      )
    ).toBeInTheDocument();
  });
});
