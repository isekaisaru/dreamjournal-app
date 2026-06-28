import { render, screen } from "@testing-library/react";
import BottomTabBar from "@/app/components/BottomTabBar";

const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/app/components/DreamEntryLauncher", () => ({
  __esModule: true,
  default: ({ buttonLabel }: { buttonLabel: string }) => (
    <button>{buttonLabel}</button>
  ),
}));

beforeEach(() => {
  mockUsePathname.mockReturnValue("/home");
  mockUseAuth.mockReturnValue({ authStatus: "authenticated", isLoggedIn: true });
});

afterEach(() => {
  document.body.classList.remove("has-bottom-nav");
});

describe("BottomTabBar", () => {
  it("未ログインでは何も描画しない", () => {
    mockUseAuth.mockReturnValue({ authStatus: "unauthenticated", isLoggedIn: false });
    const { container } = render(<BottomTabBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("認証確認中は何も描画しない", () => {
    mockUseAuth.mockReturnValue({ authStatus: "checking", isLoggedIn: false });
    const { container } = render(<BottomTabBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ログイン時に4タブと記録FABを描画する", () => {
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: "おうち" })).toHaveAttribute("href", "/home");
    expect(screen.getByRole("link", { name: "もり" })).toHaveAttribute("href", "/forest");
    expect(screen.getByRole("link", { name: "マイ夢" })).toHaveAttribute("href", "/my-dreams");
    expect(screen.getByRole("link", { name: "設定" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("button", { name: "夢をきろくする" })).toBeInTheDocument();
  });

  it("現在地のタブをアクティブ表示する", () => {
    mockUsePathname.mockReturnValue("/forest");
    render(<BottomTabBar />);
    expect(screen.getByRole("link", { name: "もり" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "おうち" })).not.toHaveAttribute("aria-current");
  });

  it("ログイン時に body へ has-bottom-nav を付与する", () => {
    render(<BottomTabBar />);
    expect(document.body.classList.contains("has-bottom-nav")).toBe(true);
  });

  it("未ログインでは has-bottom-nav を付与しない", () => {
    mockUseAuth.mockReturnValue({ authStatus: "unauthenticated", isLoggedIn: false });
    render(<BottomTabBar />);
    expect(document.body.classList.contains("has-bottom-nav")).toBe(false);
  });

  it("アンマウントで has-bottom-nav を除去する", () => {
    const { unmount } = render(<BottomTabBar />);
    expect(document.body.classList.contains("has-bottom-nav")).toBe(true);
    unmount();
    expect(document.body.classList.contains("has-bottom-nav")).toBe(false);
  });
});
