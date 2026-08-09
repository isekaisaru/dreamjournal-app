import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import LandingPage from "@/app/components/LandingPage";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

describe("LandingPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("認証済みユーザーは/homeへリダイレクトする", async () => {
    mockUseAuth.mockReturnValue({ authStatus: "authenticated" });
    render(<LandingPage />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/home"));
  });

  it("未認証ユーザーにはh1と全セクションが表示される", () => {
    mockUseAuth.mockReturnValue({ authStatus: "unauthenticated" });
    render(<LandingPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("YumeTree");
    expect(screen.getByText("モルペウスのAI分析")).toBeInTheDocument();
    expect(screen.getByText("夢の森が育つ")).toBeInTheDocument();
    expect(screen.getByText("今夜の夢が、明日の気づきになる。")).toBeInTheDocument();
    expect(screen.getByText("よくある質問")).toBeInTheDocument();
    expect(screen.getByText("Built with")).toBeInTheDocument();
  });

  it("認証確認中はローディング表示のみで、リダイレクトもコンテンツ表示もしない", () => {
    mockUseAuth.mockReturnValue({ authStatus: "checking" });
    render(<LandingPage />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
