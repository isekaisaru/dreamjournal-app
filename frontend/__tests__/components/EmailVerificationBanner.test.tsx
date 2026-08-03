import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailVerificationBanner, {
  formatRemaining,
  maskEmail,
  resendDeadlineStorageKey,
  RESEND_COOLDOWN_SECONDS,
} from "@/app/components/EmailVerificationBanner";
import { resendVerificationEmail, ApiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

jest.mock("@/lib/apiClient", () => {
  class ApiError extends Error {
    status!: number;
  }
  return {
    resendVerificationEmail: jest.fn(),
    ApiError,
  };
});

jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

const mockResend = resendVerificationEmail as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;

describe("EmailVerificationBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockedUseAuth.mockReturnValue({ user: { id: "1", email: "teruo@gmail.com" } });
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

  it("送信に成功したら、送り先のアドレスと届かないときの案内を表示する", async () => {
    const user = userEvent.setup();
    mockResend.mockResolvedValue({ message: "確認メールを送りました" });

    render(<EmailVerificationBanner />);
    await user.click(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    );

    await waitFor(() => {
      expect(screen.getByText("かくにんメールを おくったよ。")).toBeInTheDocument();
    });
    // どのアドレスへ送ったかを伏せ字で示す
    expect(screen.getByText("te***@gmail.com を みてね。")).toBeInTheDocument();
    // 届かないときの手がかりを出す
    expect(
      screen.getByText("めいわくメールの フォルダを みてね")
    ).toBeInTheDocument();
    expect(mockResend).toHaveBeenCalledTimes(1);
  });

  // 「押したけど何も起きない」を無くすのがこの改修の目的。
  // 次に送れるまでの残り時間を出し、その間はボタンを無効化する。
  it("送信後は次に送れるまでの残り時間を表示し、ボタンを無効化する", async () => {
    const user = userEvent.setup();
    mockResend.mockResolvedValue({ message: "確認メールを送りました" });

    render(<EmailVerificationBanner />);
    await user.click(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    );

    const button = await screen.findByRole("button", { name: /で おくれるよ$/ });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("あと 5ふん00びょう で おくれるよ");
  });

  it("送信結果はスクリーンリーダーにも伝わる（role=status）", async () => {
    const user = userEvent.setup();
    mockResend.mockResolvedValue({ message: "確認メールを送りました" });

    render(<EmailVerificationBanner />);
    await user.click(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    );

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("かくにんメールを おくったよ。");
  });

  it("送信に失敗したらエラーメッセージを表示し、再送ボタンに戻る", async () => {
    const user = userEvent.setup();
    const error = new ApiError(
      "確認メールを送信済みです。少し待ってからもう一度お試しください。"
    );
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
    // 失敗時はクールダウンに入れず、すぐ再試行できる
    expect(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    ).toBeEnabled();
  });

  // バナーは /home・/dream/new・/dream/[id] にあり、移動のたびに作り直される。
  // component-local な state だけで持つと「もう送れます」の顔に戻ってしまい、
  // 押すと429で弾かれる（Codexレビュー指摘）。
  it("画面を移動して作り直されても、クールダウンを引き継ぐ", async () => {
    const until = Date.now() + 120_000; // あと2分
    window.localStorage.setItem(resendDeadlineStorageKey("1"), String(until));

    render(<EmailVerificationBanner />);

    const button = await screen.findByRole("button", { name: /で おくれるよ$/ });
    expect(button).toBeDisabled();
  });

  it("保存された時刻がすでに過ぎていれば、ふつうに送れる", async () => {
    const past = Date.now() - 1000;
    window.localStorage.setItem(resendDeadlineStorageKey("1"), String(past));

    render(<EmailVerificationBanner />);

    expect(
      await screen.findByRole("button", {
        name: "かくにんメールを もういちど おくる",
      })
    ).toBeEnabled();
  });

  it("クールダウンはユーザーごとに分ける（別アカウントに持ち越さない）", async () => {
    const until = Date.now() + 120_000;
    window.localStorage.setItem(resendDeadlineStorageKey("1"), String(until));
    mockedUseAuth.mockReturnValue({ user: { id: "2", email: "other@gmail.com" } });

    render(<EmailVerificationBanner />);

    expect(
      await screen.findByRole("button", {
        name: "かくにんメールを もういちど おくる",
      })
    ).toBeEnabled();
  });

  it("メールアドレスが取れないときは伏せ字行を出さない", async () => {
    mockedUseAuth.mockReturnValue({ user: { id: "1" } });
    const user = userEvent.setup();
    mockResend.mockResolvedValue({ message: "確認メールを送りました" });

    render(<EmailVerificationBanner />);
    await user.click(
      screen.getByRole("button", { name: "かくにんメールを もういちど おくる" })
    );

    await waitFor(() => {
      expect(screen.getByText("かくにんメールを おくったよ。")).toBeInTheDocument();
    });
    expect(screen.queryByText(/を みてね。$/)).not.toBeInTheDocument();
  });
});

describe("maskEmail", () => {
  it("ローカル部の先頭2文字だけ残す", () => {
    expect(maskEmail("teruo@gmail.com")).toBe("te***@gmail.com");
  });

  it("短いローカル部でも最低1文字は伏せる", () => {
    expect(maskEmail("ab@example.com")).toBe("ab*@example.com");
  });

  it("+付きアドレスでもドメインは保つ", () => {
    expect(maskEmail("teruo+trial@gmail.com")).toBe("te*********@gmail.com");
  });

  it("@が無い値はそのまま返す（壊さない）", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});

describe("formatRemaining", () => {
  it("分と秒で表示する", () => {
    expect(formatRemaining(RESEND_COOLDOWN_SECONDS)).toBe("5ふん00びょう");
    expect(formatRemaining(65)).toBe("1ふん05びょう");
  });

  it("1分未満は秒だけ", () => {
    expect(formatRemaining(42)).toBe("42びょう");
  });
});
