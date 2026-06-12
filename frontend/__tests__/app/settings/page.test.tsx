import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsPage from "@/app/settings/page";
import { useAuth } from "@/context/AuthContext";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  updateProfile: jest.fn(),
  default: {},
}));

jest.mock("@/lib/toast", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/app/components/MorpheusImage", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-image" />,
}));

jest.mock("@/app/components/MorpheusLoginRequired", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-login-required" />,
}));

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

type AuthValue = ReturnType<typeof useAuth>;

function makeAuthValue(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    authStatus: "authenticated",
    isLoggedIn: true,
    user: {
      id: "1",
      email: "a@b.com",
      username: "tester",
      age_group: "adult",
      analysis_tone: "auto",
    },
    userId: "1",
    login: jest.fn(),
    logout: jest.fn(),
    deleteUser: jest.fn(),
    error: null,
    ...overrides,
  } as AuthValue;
}

/** 削除モーダルを開き、ジュニアロックを解いて最終確認まで進める */
function proceedToFinalConfirm() {
  fireEvent.click(screen.getByRole("button", { name: "さくじょ" }));
  const question = screen.getByText(/\d+ \+ \d+ = \?/).textContent ?? "";
  const [a, b] = (question.match(/\d+/g) ?? []).map(Number);
  fireEvent.change(screen.getByPlaceholderText("?に入る数字"), {
    target: { value: String(a + b) },
  });
  fireEvent.click(screen.getByRole("button", { name: "すすむ" }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. 未認証ガード
// ---------------------------------------------------------------------------

describe("未認証ガード", () => {
  it("unauthenticated のときはログイン導線を表示し、設定画面を出さない", () => {
    mockedUseAuth.mockReturnValue(
      makeAuthValue({
        authStatus: "unauthenticated",
        isLoggedIn: false,
        user: null,
        userId: null,
      })
    );

    render(<SettingsPage />);

    expect(screen.getByTestId("morpheus-login-required")).toBeInTheDocument();
    expect(
      screen.queryByText("アカウントをさくじょする")
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. userId が無い状態での削除
// ---------------------------------------------------------------------------

describe("userId が無い状態での削除", () => {
  it("画面内にエラーを表示し、無反応にならない", async () => {
    mockedUseAuth.mockReturnValue(makeAuthValue({ userId: null }));

    render(<SettingsPage />);
    proceedToFinalConfirm();
    fireEvent.click(
      screen.getByRole("button", { name: "はい、すべて さくじょします" })
    );

    expect(
      await screen.findByText(/ログイン情報を確認できませんでした/)
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. 削除APIが失敗した場合
// ---------------------------------------------------------------------------

describe("削除APIが失敗した場合", () => {
  it("エラーを表示し、logout / redirect に進まない", async () => {
    const authValue = makeAuthValue();
    (authValue.deleteUser as jest.Mock).mockRejectedValue(new Error("boom"));
    mockedUseAuth.mockReturnValue(authValue);

    render(<SettingsPage />);
    proceedToFinalConfirm();
    fireEvent.click(
      screen.getByRole("button", { name: "はい、すべて さくじょします" })
    );

    expect(
      await screen.findByText(/さくじょに しっぱいしました/)
    ).toBeInTheDocument();
    expect(authValue.logout).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. 削除成功時
// ---------------------------------------------------------------------------

describe("削除成功時", () => {
  it("完了メッセージを表示し、logout API 経由の二重ログアウトをしない", async () => {
    const authValue = makeAuthValue();
    (authValue.deleteUser as jest.Mock).mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue(authValue);

    render(<SettingsPage />);
    proceedToFinalConfirm();
    fireEvent.click(
      screen.getByRole("button", { name: "はい、すべて さくじょします" })
    );

    expect(
      await screen.findByText("アカウントを さくじょしました")
    ).toBeInTheDocument();
    // ローカル状態のクリアは deleteUser() 側の責務。settings からは logout を呼ばない
    expect(authValue.logout).not.toHaveBeenCalled();
  });
});
