import { render, screen, within } from "@testing-library/react";

import DreamAdventurePanel from "@/app/components/DreamAdventurePanel";
import type { Dream } from "@/app/types";

// アニメーション・画像は描画に不要なので素の要素に置き換える
jest.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          ...props
        }: {
          children?: React.ReactNode;
          [key: string]: unknown;
        }) => {
          const Tag = tag as keyof JSX.IntrinsicElements;
          // framer 固有の props は除去して描画する
          const {
            initial: _i,
            animate: _a,
            transition: _t,
            ...rest
          } = props as Record<string, unknown>;
          return <Tag {...rest}>{children}</Tag>;
        },
    }
  ),
}));

jest.mock("@/app/components/MorpheusImage", () => ({
  __esModule: true,
  default: () => <div data-testid="morpheus" />,
}));

const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Tokyo",
});

const dream = (overrides: Partial<Dream> = {}): Dream =>
  ({
    id: Math.random(),
    title: "ゆめ",
    content: "ないよう",
    created_at: `${today}T01:00:00+09:00`,
    ...overrides,
  }) as unknown as Dream;

const dreamWithEmotion = () =>
  dream({ analysis_json: { emotion_tags: ["うれしい"] } } as Partial<Dream>);

describe("DreamAdventurePanel 夢クエスト", () => {
  it("感情タグが1つ以上あれば「きもちを1つえらぶ」が達成になる", () => {
    render(<DreamAdventurePanel dreams={[dreamWithEmotion()]} />);

    const quest = screen.getByText("きもちを1つえらぶ").closest("li");
    expect(quest).not.toBeNull();
    expect(within(quest as HTMLElement).getByText("1/1")).toBeInTheDocument();
    expect(within(quest as HTMLElement).getByText("★")).toBeInTheDocument();
  });

  it("感情タグが無いと「きもちを1つえらぶ」は未達成になる", () => {
    render(<DreamAdventurePanel dreams={[dream()]} />);

    const quest = screen.getByText("きもちを1つえらぶ").closest("li");
    expect(within(quest as HTMLElement).getByText("0/1")).toBeInTheDocument();
    expect(within(quest as HTMLElement).queryByText("★")).not.toBeInTheDocument();
  });

  it("月間クエストの文言が「今月の夢を5つあつめる」になっている", () => {
    render(<DreamAdventurePanel dreams={[dream()]} />);

    expect(screen.getByText("今月の夢を5つあつめる")).toBeInTheDocument();
    expect(screen.queryByText("今月の夢を5つのこす")).not.toBeInTheDocument();
  });

  it("達成済みクエストがあると達成メッセージ（報酬表示）が出る", () => {
    render(<DreamAdventurePanel dreams={[dreamWithEmotion()]} />);

    // 今日の夢1つ＋感情タグの2クエスト達成
    expect(screen.getByText("夢クエスト達成中！")).toBeInTheDocument();
    expect(screen.getByText("小さな夢バッジに近づいたよ")).toBeInTheDocument();
  });

  it("達成クエストが無いと報酬表示は出ない", () => {
    // 今日でも今月でもない過去の、感情タグ無し夢のみ → 達成0
    const past = dream({ created_at: "2000-01-01T00:00:00+09:00" });
    render(<DreamAdventurePanel dreams={[past]} />);

    expect(screen.queryByText(/夢クエスト.*達成/)).not.toBeInTheDocument();
  });
});
