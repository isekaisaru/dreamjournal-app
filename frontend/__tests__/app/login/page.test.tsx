import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Login from "@/app/login/page";
import { clientLogin } from "@/lib/apiClient";

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  clientLogin: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const mockLogin = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => ({
    login: mockLogin,
    authStatus: "unauthenticated",
    error: null,
  }),
}));

jest.mock("@/app/components/MorpheusHero", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus-hero" />,
}));

jest.mock("@/app/components/MorpheusGuide", () => ({
  __esModule: true,
  MorpheusGuideLogin: () => <div data-testid="morpheus-guide" />,
}));

const mockedClientLogin = clientLogin as jest.MockedFunction<typeof clientLogin>;

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("メールアドレス"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByLabelText("パスワード"), {
    target: { value: "password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "つづける" }));
}

describe("Login page cold-start retry UX", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows the warming-up notice and button label while clientLogin retries", async () => {
    // clientLogin がコールドスタートのリトライに入った状態を再現する。
    // onColdStartRetry を呼んだあと未解決のままにして、表示を観測できるようにする。
    mockedClientLogin.mockImplementation((_credentials, options) => {
      options?.onColdStartRetry?.(1);
      return new Promise(() => {});
    });

    render(<Login />);
    fillAndSubmit();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "サーバーを起動中..." })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("サーバーを起動しています。初回は少し時間がかかります。")
    ).toBeInTheDocument();
  });

  it("does not show the warming-up notice on a normal successful login", async () => {
    mockedClientLogin.mockResolvedValue({
      user: { id: "1", email: "test@example.com" } as never,
    });

    render(<Login />);
    fillAndSubmit();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
    expect(
      screen.queryByText("サーバーを起動しています。初回は少し時間がかかります。")
    ).not.toBeInTheDocument();
  });
});
