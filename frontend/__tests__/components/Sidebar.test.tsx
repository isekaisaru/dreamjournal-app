import { render, screen } from "@testing-library/react";
import Sidebar from "@/app/components/Sidebar";

const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/app/components/CommandPalette", () => ({
  __esModule: true,
  useCommandPalette: () => ({ open: jest.fn(), close: jest.fn(), toggle: jest.fn() }),
}));

jest.mock("@/app/components/ThemeToggle", () => ({
  __esModule: true,
  default: () => <button type="button">theme</button>,
}));

jest.mock("@/lib/toast", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

beforeEach(() => {
  mockPathname.mockReturnValue("/home");
  mockUseAuth.mockReturnValue({
    isLoggedIn: true,
    user: { username: "はると", premium: false },
    logout: jest.fn(),
  });
});

afterEach(() => {
  document.body.classList.remove("has-sidebar");
});

describe("Sidebar", () => {
  it("未ログインでは何も描画しない", () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, user: null, logout: jest.fn() });
    const { container } = render(<Sidebar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ログイン時にナビ・さがす・ログアウトを描画する", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: "夢の森" })).toHaveAttribute("href", "/forest");
    expect(screen.getByRole("link", { name: "マイ夢" })).toHaveAttribute("href", "/my-dreams");
    expect(screen.getByRole("link", { name: "設定" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("button", { name: /さがす/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ログアウト/ })).toBeInTheDocument();
  });

  it("現在地のナビをアクティブ表示する", () => {
    mockPathname.mockReturnValue("/forest");
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "夢の森" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "ホーム" })).not.toHaveAttribute("aria-current");
  });

  it("表示時に body へ has-sidebar を付与し、アンマウントで除去する", () => {
    const { unmount } = render(<Sidebar />);
    expect(document.body.classList.contains("has-sidebar")).toBe(true);
    unmount();
    expect(document.body.classList.contains("has-sidebar")).toBe(false);
  });

  it("未ログインでは has-sidebar を付与しない", () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, user: null, logout: jest.fn() });
    render(<Sidebar />);
    expect(document.body.classList.contains("has-sidebar")).toBe(false);
  });
});
