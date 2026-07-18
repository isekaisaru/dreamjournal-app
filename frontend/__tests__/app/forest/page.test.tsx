import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ForestPage from "@/app/forest/page";
import { getDreamProfiles } from "@/lib/apiClient";
import type { DreamProfile } from "@/app/types";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/context/AuthContext", () => ({
  __esModule: true,
  useAuth: () => ({ authStatus: "authenticated" }),
}));

jest.mock("@/lib/apiClient", () => ({
  __esModule: true,
  getDreamProfiles: jest.fn(),
}));

jest.mock("@/lib/toast", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/useRecentDream", () => ({
  __esModule: true,
  useRecentDream: jest.fn(() => ({ recentDream: null, loading: false })),
}));

jest.mock("@/app/components/forest/ForestGuide", () => ({
  __esModule: true,
  default: () => <div data-testid="forest-guide" />,
}));

jest.mock("@/app/components/forest/ForestScene", () => ({
  __esModule: true,
  default: ({ profiles, selectedProfileId, onSelectTree, onCloseSheet }: any) => (
    <div data-testid="forest-scene">
      <span data-testid="selected-id">{selectedProfileId ?? "none"}</span>
      {profiles.map((p: DreamProfile) => (
        <button key={p.id} onClick={() => onSelectTree(p)}>
          {`select-${p.id}`}
        </button>
      ))}
      <button onClick={onCloseSheet}>close-sheet</button>
    </div>
  ),
}));

jest.mock("@/app/components/forest/TreeSidePanel", () => ({
  __esModule: true,
  default: ({ selectedProfile }: any) => (
    <div data-testid="tree-side-panel-mock">{selectedProfile ? selectedProfile.name : "none"}</div>
  ),
}));

const mockedGetDreamProfiles = getDreamProfiles as jest.MockedFunction<typeof getDreamProfiles>;

function profile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "自分",
    avatar_emoji: "🧑",
    color: "#8b5cf6",
    relationship: "self",
    active: true,
    position: 1,
    archived: false,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    dreams_count: 1,
    ...overrides,
  };
}

describe("ForestPage 選択状態の配線", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDreamProfiles.mockResolvedValue([
      profile({ id: 1, name: "自分" }),
      profile({ id: 2, name: "モカ", archived: true }),
    ]);
  });

  it("ForestSceneで木を選択するとTreeSidePanelにも同じプロフィールが伝わる", async () => {
    render(<ForestPage />);

    await waitFor(() => expect(screen.getByTestId("forest-scene")).toBeInTheDocument());
    expect(screen.getByTestId("tree-side-panel-mock")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "select-1" }));

    expect(screen.getByTestId("selected-id")).toHaveTextContent("1");
    expect(screen.getByTestId("tree-side-panel-mock")).toHaveTextContent("自分");
  });

  it("onCloseSheetで選択が解除される", async () => {
    render(<ForestPage />);

    await waitFor(() => expect(screen.getByTestId("forest-scene")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "select-1" }));
    expect(screen.getByTestId("tree-side-panel-mock")).toHaveTextContent("自分");

    fireEvent.click(screen.getByRole("button", { name: "close-sheet" }));

    expect(screen.getByTestId("tree-side-panel-mock")).toHaveTextContent("none");
  });

  it("archivedプロフィールはForestSceneに渡す前に除外される", async () => {
    render(<ForestPage />);

    await waitFor(() => expect(screen.getByTestId("forest-scene")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "select-1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "select-2" })).not.toBeInTheDocument();
  });
});
