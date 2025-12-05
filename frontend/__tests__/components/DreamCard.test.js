import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ✅ 実際のファイル位置に合わせて import
import DreamCard from "@/app/components/DreamCard";
import { createMockDream, createMockEmotion } from "../utils/mockFactory";

// ✅ next/link を a タグに置き換え（クリックしても遷移しない）
jest.mock("next/link", () => {
  return ({ href, children, ...props }) => (
    <a
      href={typeof href === "string" ? href : href?.pathname}
      onClick={(e) => e.preventDefault()}
      {...props}
    >
      {children}
    </a>
  );
});

describe("DreamCard", () => {
  // 基本となる夢データ（「準備」）
  const baseDream = {
    ...createMockDream({
      title: "眠りの城",
      content: "短い内容",
    }),
    // 実装が createdAt / created_at どちらでも対応できるよう両方入れておく
    createdAt: "2025-01-01T00:00:00.000Z",
    created_at: "2025-01-01T00:00:00.000Z",
    emotions: [],
  };

  test("AAA: タイトルと短い本文が表示される（表示テスト）", () => {
    // Arrange（準備）
    const dream = { ...baseDream };

    // Act（やってみる）
    render(<DreamCard dream={dream} />);

    // Assert（答え合わせ）
    expect(screen.getByText(dream.title)).toBeInTheDocument();
    expect(screen.getByText("短い内容")).toBeInTheDocument();
  });

  test("AAA: 長い本文は省略表示か「続きを読む」が出る（表示 + props）", () => {
    // Arrange
    const longContent = "あ".repeat(120);
    const dream = { ...baseDream, content: longContent };

    // Act
    render(<DreamCard dream={dream} />);

    // Assert
    // 先頭の一部が出ていること
    const head = longContent.slice(0, 10);
    expect(screen.getByText(new RegExp(head))).toBeInTheDocument();
    // 省略記号か「続きを読む」のどちらかが出ていればOK（実装差に強い）
    const ellipsis = screen.queryByText(/…|\.\.\./); // 全角/半角対応
    const readMore = screen.queryByText(/続きを読む|read more/i);
    expect(ellipsis || readMore).not.toBeNull();
  });

  test("AAA: 感情タグが渡されたら表示される（props）", () => {
    // Arrange
    const emotions = [
      createMockEmotion({ id: 1, name: "嬉しい" }),
      createMockEmotion({ id: 2, name: "悲しい" }),
    ];
    const dream = { ...baseDream, emotions };

    // Act
    render(<DreamCard dream={dream} />);

    // Assert
    expect(screen.getByText("嬉しい")).toBeInTheDocument();
    expect(screen.getByText("悲しい")).toBeInTheDocument();
  });

  test("AAA: 詳細ページへのリンクがあり、href に id が入っている（リンク/イベント）", async () => {
    // Arrange
    const user = userEvent.setup();
    const dream = { ...baseDream, id: 42, title: "リンクテスト" };

    // Act
    render(<DreamCard dream={dream} />);

    // Assert
    const link = screen.getAllByRole("link")[0]; // 最初のリンクを取得（実装によりカード全体がリンク等の差に対応）
    expect(link).toBeInTheDocument();

    const href = link.getAttribute("href") || "";
    // dream/42, /dream/42, dreams/42, /dreams/42 などを許容（実装差OKの緩い判定）
    expect(href).toMatch(/^\/?dreams?\/?\d+/);
    expect(href).toContain(String(dream.id));

    // クリックしても遷移しない（preventDefault 済み）
    await user.click(link);
  });

  test("AAA: 本文が空ならフォールバックの文言が見える（表示テスト）", () => {
    // Arrange
    const dream = { ...baseDream, content: "" };

    // Act
    render(<DreamCard dream={dream} />);

    // Assert
    // 実装の文言に差があるので代表パターンを許容
    const fallback = screen.queryByText(/内容がありません|no content|empty/i);
    expect(fallback).not.toBeNull();
  });
});
