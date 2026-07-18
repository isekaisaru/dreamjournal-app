import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TreePreviewContent from "@/app/components/forest/TreePreviewContent";
import type { Dream, DreamProfile } from "@/app/types";

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

function dream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "古い木のゆめ",
    userId: 1,
    created_at: "2026-06-14T00:00:00Z",
    updated_at: "2026-06-14T00:00:00Z",
    emotions: [{ id: 1, name: "喜び" }],
    ...overrides,
  };
}

describe("TreePreviewContent", () => {
  it("プロフィール見出しを表示する", () => {
    render(
      <TreePreviewContent
        profile={profile({ name: "モカ", dreams_count: 3 })}
        recentDream={null}
        loading={false}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByText("モカの き")).toBeInTheDocument();
    expect(screen.getByText(/ゆめ 3こ/)).toBeInTheDocument();
  });

  it("直近の夢とその感情タグを表示する", () => {
    render(
      <TreePreviewContent
        profile={profile()}
        recentDream={dream({ title: "空飛ぶ夢" })}
        loading={false}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByText(/空飛ぶ夢/)).toBeInTheDocument();
    expect(screen.getByText("喜び")).toBeInTheDocument();
  });

  it("読み込み中は「よみこんでいるよ…」を表示し、直近の夢は表示しない", () => {
    render(
      <TreePreviewContent
        profile={profile()}
        recentDream={null}
        loading={true}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByText("よみこんでいるよ…")).toBeInTheDocument();
    expect(screen.queryByText("さいきんの ゆめ：")).not.toBeInTheDocument();
  });

  it("感情が配列でない場合は空扱いにする", () => {
    render(
      <TreePreviewContent
        profile={profile()}
        recentDream={dream({ title: "ふしぎな森", emotions: "bad" as any })}
        loading={false}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByText(/ふしぎな森/)).toBeInTheDocument();
    expect(screen.queryByText("喜び")).not.toBeInTheDocument();
  });

  it("タイトルが文字列でない場合は直近の夢欄を表示しない", () => {
    render(
      <TreePreviewContent
        profile={profile()}
        recentDream={dream({ title: null as any })}
        loading={false}
        onOpen={jest.fn()}
      />
    );

    expect(screen.queryByText("さいきんの ゆめ：")).not.toBeInTheDocument();
  });

  it("CTAクリックでonOpenにprofileを渡して呼び出す", () => {
    const onOpen = jest.fn();
    const p = profile({ id: 7 });
    render(<TreePreviewContent profile={p} recentDream={null} loading={false} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("button", { name: /この きを 見る/ }));

    expect(onOpen).toHaveBeenCalledWith(p);
  });
});
