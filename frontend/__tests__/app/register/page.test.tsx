import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import RegisterPage from "@/app/register/page";
import { useAuth } from "@/context/AuthContext";
import { clientRegister, convertTrial } from "@/lib/apiClient";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  clientRegister: jest.fn(),
  convertTrial: jest.fn(),
}));

jest.mock("@/app/components/MorpheusSmall", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-small" />,
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedClientRegister = clientRegister as jest.MockedFunction<
  typeof clientRegister
>;
const mockedConvertTrial = convertTrial as jest.MockedFunction<
  typeof convertTrial
>;

type AuthValue = ReturnType<typeof useAuth>;

const makeAuth = (over: Partial<AuthValue>): AuthValue =>
  ({
    authStatus: "unauthenticated",
    isLoggedIn: false,
    user: null,
    userId: null,
    login: jest.fn(),
    logout: jest.fn(),
    deleteUser: jest.fn(),
    error: null,
    ...over,
  }) as AuthValue;

const fillAndSubmit = () => {
  const set = (id: string, value: string) =>
    fireEvent.change(document.getElementById(id) as HTMLInputElement, {
      target: { value },
    });
  set("register-username", "newname");
  set("register-email", "new@example.com");
  set("register-password", "abcd1234");
  set("register-password-confirmation", "abcd1234");
  fireEvent.click(
    document.querySelector('input[type="checkbox"]') as HTMLInputElement
  );
  fireEvent.click(screen.getByRole("button", { name: /はじめる|とうろく|登録/ }));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedClientRegister.mockResolvedValue({ user: { id: "1" } } as Awaited<
    ReturnType<typeof clientRegister>
  >);
  mockedConvertTrial.mockResolvedValue({ user: { id: "1" } } as Awaited<
    ReturnType<typeof convertTrial>
  >);
});

describe("RegisterPage トライアル昇格の分岐", () => {
  it("デスクトップ用のAuthVisualPanel(register)をあわせて描画する", () => {
    mockedUseAuth.mockReturnValue(makeAuth({}));
    render(<RegisterPage />);
    // MorpheusSmallの既存メッセージと冒頭が似ているため、
    // AuthVisualPanel側にしか出現しない一節で存在確認する
    expect(screen.getByText(/ぼくはモルペウス/)).toBeInTheDocument();
  });

  it("認証確認中は submit ボタンが disabled になる", () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({
        authStatus: "checking",
      })
    );

    render(<RegisterPage />);

    expect(screen.getByRole("button", { name: /じゅんび/ })).toBeDisabled();
  });

  it("認証確認中に submit されても register / convert は呼ばない", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({
        authStatus: "checking",
      })
    );

    render(<RegisterPage />);
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    await waitFor(() => {
      expect(mockedClientRegister).not.toHaveBeenCalled();
      expect(mockedConvertTrial).not.toHaveBeenCalled();
    });
  });

  it("トライアルユーザーは convertTrial を呼ぶ（clientRegisterは呼ばない）", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({
        authStatus: "authenticated",
        isLoggedIn: true,
        user: { id: "9", trial_user: true } as AuthValue["user"],
      })
    );

    render(<RegisterPage />);
    fillAndSubmit();

    await waitFor(() => expect(mockedConvertTrial).toHaveBeenCalledTimes(1));
    expect(mockedClientRegister).not.toHaveBeenCalled();
  });

  it("通常の新規ユーザーは clientRegister を呼ぶ（convertTrialは呼ばない）", async () => {
    mockedUseAuth.mockReturnValue(makeAuth({}));

    render(<RegisterPage />);
    fillAndSubmit();

    await waitFor(() => expect(mockedClientRegister).toHaveBeenCalledTimes(1));
    expect(mockedConvertTrial).not.toHaveBeenCalled();
  });

  it("認証済みだが user が null の場合は clientRegister にフォールバックしない", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({
        authStatus: "authenticated",
        isLoggedIn: true,
        user: null,
      })
    );

    render(<RegisterPage />);
    fillAndSubmit();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/home"));
    expect(mockedClientRegister).not.toHaveBeenCalled();
    expect(mockedConvertTrial).not.toHaveBeenCalled();
  });

  it("認証済み通常ユーザーは clientRegister を呼ばず /home に戻す", async () => {
    mockedUseAuth.mockReturnValue(
      makeAuth({
        authStatus: "authenticated",
        isLoggedIn: true,
        user: { id: "2", trial_user: false } as AuthValue["user"],
      })
    );

    render(<RegisterPage />);
    fillAndSubmit();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/home"));
    expect(mockedClientRegister).not.toHaveBeenCalled();
    expect(mockedConvertTrial).not.toHaveBeenCalled();
  });
});

// 422の理由をユーザーに伝える。
// バックエンドは error_codes: [{ field, code }] を返し、フロントはそれだけを見て
// 文言を決める（英語メッセージを解析しない）。変換の網羅的なケースは
// __tests__/lib/registrationErrors.test.ts が担当し、ここでは
// 「画面に実際に出るか」「通常登録とTrial昇格で同じ契約か」を確認する。
describe("RegisterPage 失敗理由の表示", () => {
  const trialAuth = () =>
    makeAuth({
      authStatus: "authenticated",
      isLoggedIn: true,
      user: { id: "9", trial_user: true } as AuthValue["user"],
    });

  const guestAuth = () => makeAuth({});

  /** apiClient が投げる ApiError 相当（status と data を持つ） */
  const apiError = (status: number, data?: unknown) =>
    Object.assign(new Error("api failed"), { status, data });

  const takenCodes = (...fields: string[]) => ({
    error_codes: fields.map((field) => ({ field, code: "taken" })),
  });

  it("Trial昇格でメールアドレス重複(422)なら専用メッセージを表示する", async () => {
    mockedUseAuth.mockReturnValue(trialAuth());
    mockedConvertTrial.mockRejectedValue(apiError(422, takenCodes("email")));

    render(<RegisterPage />);
    fillAndSubmit();

    expect(await screen.findByText(/メールアドレスは もう つかわれている/)).toBeInTheDocument();
  });

  it("Trial昇格でニックネーム重複(422)なら専用メッセージを表示する", async () => {
    mockedUseAuth.mockReturnValue(trialAuth());
    mockedConvertTrial.mockRejectedValue(apiError(422, takenCodes("username")));

    render(<RegisterPage />);
    fillAndSubmit();

    expect(await screen.findByText(/ニックネームは もう つかわれている/)).toBeInTheDocument();
  });

  it("メールとニックネームが両方重複していれば両方の理由を表示する", async () => {
    mockedUseAuth.mockReturnValue(trialAuth());
    mockedConvertTrial.mockRejectedValue(
      apiError(422, takenCodes("email", "username"))
    );

    render(<RegisterPage />);
    fillAndSubmit();

    const message = await screen.findByText(/メールアドレスは もう つかわれている/);
    expect(message).toHaveTextContent(/ニックネームは もう つかわれている/);
  });

  it("通常登録でも同じエラー契約で専用メッセージを表示する", async () => {
    mockedUseAuth.mockReturnValue(guestAuth());
    mockedClientRegister.mockRejectedValue(apiError(422, takenCodes("email")));

    render(<RegisterPage />);
    fillAndSubmit();

    expect(await screen.findByText(/メールアドレスは もう つかわれている/)).toBeInTheDocument();
  });

  it("500では内部情報を出さず汎用メッセージにする", async () => {
    mockedUseAuth.mockReturnValue(guestAuth());
    mockedClientRegister.mockRejectedValue(
      apiError(500, { error: "Internal Server Error" })
    );

    render(<RegisterPage />);
    fillAndSubmit();

    const message = await screen.findByText(/うまく はじめられなかったよ/);
    expect(message).not.toHaveTextContent("Internal Server Error");
  });

  it("通信失敗（statusなし）でも汎用メッセージにする", async () => {
    mockedUseAuth.mockReturnValue(guestAuth());
    mockedClientRegister.mockRejectedValue(new Error("Network request failed"));

    render(<RegisterPage />);
    fillAndSubmit();

    expect(await screen.findByText(/うまく はじめられなかったよ/)).toBeInTheDocument();
  });

  it("422のあともローディングが解除され、直して再送信できる", async () => {
    mockedUseAuth.mockReturnValue(guestAuth());
    mockedClientRegister.mockRejectedValueOnce(apiError(422, takenCodes("email")));

    render(<RegisterPage />);
    fillAndSubmit();

    await screen.findByText(/メールアドレスは もう つかわれている/);

    // 二重送信防止のためのローディングが解除され、ボタンが再び押せる状態に戻る
    const submitButton = screen.getByRole("button", { name: /はじめる/ });
    expect(submitButton).not.toBeDisabled();

    // メールアドレスを直して再送信すると、今度は成功して login が呼ばれる
    mockedClientRegister.mockResolvedValueOnce({ user: { id: "1" } } as Awaited<
      ReturnType<typeof clientRegister>
    >);
    fireEvent.change(document.getElementById("register-email") as HTMLInputElement, {
      target: { value: "another@example.com" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => expect(mockedClientRegister).toHaveBeenCalledTimes(2));
    expect(mockedClientRegister).toHaveBeenLastCalledWith(
      expect.objectContaining({ email: "another@example.com" })
    );
  });
});
