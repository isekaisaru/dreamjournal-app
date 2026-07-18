import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TreeSidePanel from "@/app/components/forest/TreeSidePanel";
import type { DreamProfile } from "@/app/types";

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

describe("TreeSidePanel", () => {
  it("profilesが空のときは何も描画しない", () => {
    const { container } = render(
      <TreeSidePanel
        profiles={[]}
        selectedProfile={null}
        recentDream={null}
        loading={false}
        totalDreams={0}
        topProfile={null}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("未選択時はきょうのもりカードとヒントを表示する", () => {
    render(
      <TreeSidePanel
        profiles={[profile()]}
        selectedProfile={null}
        recentDream={null}
        loading={false}
        totalDreams={5}
        topProfile={profile({ name: "モカ" })}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("きょうの もり")).toBeInTheDocument();
    expect(screen.getByText(/5この/)).toBeInTheDocument();
    expect(screen.getByText("きを えらんでね")).toBeInTheDocument();
  });

  it("選択時はTreePreviewContentを表示し、きょうのもりカードは表示しない", () => {
    render(
      <TreeSidePanel
        profiles={[profile()]}
        selectedProfile={profile({ name: "モカ" })}
        recentDream={null}
        loading={false}
        totalDreams={5}
        topProfile={null}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("モカの き")).toBeInTheDocument();
    expect(screen.queryByText("きょうの もり")).not.toBeInTheDocument();
  });

  it("選択時のonPeekRoomクリックでprofileを渡す", () => {
    const onPeekRoom = jest.fn();
    const p = profile({ name: "モカ" });
    render(
      <TreeSidePanel
        profiles={[profile()]}
        selectedProfile={p}
        recentDream={null}
        loading={false}
        totalDreams={5}
        topProfile={null}
        onOpen={jest.fn()}
        onPeekRoom={onPeekRoom}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /へやを のぞく/ }));

    expect(onPeekRoom).toHaveBeenCalledWith(p);
  });

  it("常駐パネルにhidden lg:flexクラスを持つ", () => {
    render(
      <TreeSidePanel
        profiles={[profile()]}
        selectedProfile={null}
        recentDream={null}
        loading={false}
        totalDreams={0}
        topProfile={null}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );

    const panel = screen.getByTestId("tree-side-panel");
    expect(panel).toHaveClass("hidden", "lg:flex");
  });
});
