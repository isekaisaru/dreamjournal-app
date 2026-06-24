import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import RegisterPage from "@/app/register/page";
import { useAuth } from "@/context/AuthContext";
import { clientRegister, convertTrial } from "@/lib/apiClient";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
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
});
