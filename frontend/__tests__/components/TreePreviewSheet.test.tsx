import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TreePreviewSheet from "@/app/components/forest/TreePreviewSheet";
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

describe("TreePreviewSheet", () => {
  it("profileがnullのときは何も描画しない", () => {
    render(
      <TreePreviewSheet
        profile={null}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /この きを 見る/ })).not.toBeInTheDocument();
  });

  it("profileがあるときはlg:hiddenクラス付きで描画し、中身をTreePreviewContentへ委譲する", () => {
    render(
      <TreePreviewSheet
        profile={profile({ name: "モカ" })}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText("モカの き")).toBeInTheDocument();
    expect(screen.getByTestId("tree-preview-sheet")).toHaveClass("lg:hidden");
  });

  it("閉じるボタンでonCloseが呼ばれる", () => {
    const onClose = jest.fn();
    render(
      <TreePreviewSheet
        profile={profile()}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
        onPeekRoom={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "とじる" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("CTAクリックでonOpenにprofileを渡す", () => {
    const onOpen = jest.fn();
    const p = profile({ id: 5 });
    render(
      <TreePreviewSheet
        profile={p}
        recentDream={null}
        loading={false}
        onOpen={onOpen}
        onPeekRoom={jest.fn()}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /この きを 見る/ }));

    expect(onOpen).toHaveBeenCalledWith(p);
  });

  it("「へやを のぞく」クリックでonPeekRoomにprofileを渡す", () => {
    const onPeekRoom = jest.fn();
    const p = profile({ id: 5 });
    render(
      <TreePreviewSheet
        profile={p}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
        onPeekRoom={onPeekRoom}
        onClose={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /へやを のぞく/ }));

    expect(onPeekRoom).toHaveBeenCalledWith(p);
  });
});
