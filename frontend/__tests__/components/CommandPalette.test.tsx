import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  CommandPaletteProvider,
  useCommandPalette,
} from "@/app/components/CommandPalette";

// 遅延fetch(setRecentDreams)の解決を act 内で消化し、警告を出さない
async function flushFetch() {
  await act(async () => {
    await Promise.resolve();
  });
}

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  default: { get: jest.fn().mockResolvedValue([]) },
}));

function setup() {
  return render(
    <CommandPaletteProvider>
      <div>app</div>
    </CommandPaletteProvider>
  );
}

beforeEach(() => {
  mockPush.mockClear();
  mockUseAuth.mockReturnValue({ isLoggedIn: true, authStatus: "authenticated" });
});

describe("CommandPalette", () => {
  it("ログイン時に ⌘K で開き、Esc で閉じる", async () => {
    setup();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await flushFetch();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("未ログインでは ⌘K で何も開かない", () => {
    mockUseAuth.mockReturnValue({ isLoggedIn: false, authStatus: "unauthenticated" });
    setup();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("入力で候補を絞り込む", async () => {
    setup();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = screen.getByPlaceholderText("夢を検索 / コマンド…");
    fireEvent.change(input, { target: { value: "もり" } });
    expect(screen.getByText("もりへ")).toBeInTheDocument();
    expect(screen.queryByText("ホームへ")).toBeNull();
    await flushFetch();
  });

  it("Enter で選択中コマンドを実行する（先頭=新しい夢を記録→/dream/new）", async () => {
    setup();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = screen.getByPlaceholderText("夢を検索 / コマンド…");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/dream/new");
    await flushFetch();
  });

  it("Provider外でuseCommandPaletteを呼んでもno-opで落ちない", () => {
    function Probe() {
      const palette = useCommandPalette();
      return (
        <button onClick={() => palette.open()}>open</button>
      );
    }
    render(<Probe />);
    expect(() => fireEvent.click(screen.getByText("open"))).not.toThrow();
  });
});
