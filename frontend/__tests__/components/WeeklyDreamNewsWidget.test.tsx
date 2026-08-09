import React from "react";
import { render, screen } from "@testing-library/react";
import WeeklyDreamNewsWidget from "@/app/components/WeeklyDreamNewsWidget";
import type { Dream, DreamProfile } from "@/app/types";

// 「直近7日」判定が実行日に依存しないよう、現在時刻を固定する
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-07-12T00:00:00+09:00"));
});

afterEach(() => {
  jest.useRealTimers();
});

function makeProfile(overrides: Partial<DreamProfile> = {}): DreamProfile {
  return {
    id: 1,
    name: "ねこさん",
    avatar_emoji: "🐱",
    color: "#f97316",
    relationship: "self",
    active: true,
    position: 0,
    archived: false,
    created_at: "2026-01-01T00:00:00+09:00",
    updated_at: "2026-01-01T00:00:00+09:00",
    ...overrides,
  };
}

function makeDream(overrides: Partial<Dream> = {}): Dream {
  return {
    id: 1,
    title: "空を飛んで学校へ行った夢",
    content: "空を飛んでいました",
    userId: 1,
    dream_profile_id: 1,
    created_at: "2026-07-11T09:00:00+09:00",
    updated_at: "2026-07-11T09:00:00+09:00",
    emotions: [],
    ...overrides,
  };
}

describe("WeeklyDreamNewsWidget", () => {
  it("タイトルは常に「今週のゆめニュース」で固定される", () => {
    const profile = makeProfile();
    const dream = makeDream();
    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[profile]} />);

    expect(screen.getByText("今週のゆめニュース")).toBeInTheDocument();
  });

  it("アクティブプロフィールが1件のとき「今週はこんな夢を見たよ」を表示する", () => {
    const profile = makeProfile();
    const dream = makeDream();
    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[profile]} />);

    expect(screen.getByText("今週はこんな夢を見たよ")).toBeInTheDocument();
  });

  it("アクティブプロフィールが2件以上のとき「みんなの今週の夢を見てみよう」を表示する", () => {
    const profileA = makeProfile({ id: 1, name: "ねこさん" });
    const profileB = makeProfile({ id: 2, name: "モカ" });
    const dreamA = makeDream({ id: 1, dream_profile_id: 1 });
    const dreamB = makeDream({ id: 2, dream_profile_id: 2, title: "大きなお魚を追いかけた夢" });

    render(
      <WeeklyDreamNewsWidget dreams={[dreamA, dreamB]} profiles={[profileA, profileB]} />
    );

    expect(screen.getByText("みんなの今週の夢を見てみよう")).toBeInTheDocument();
  });

  it("直近7日より前の夢は集計対象外になる", () => {
    const profile = makeProfile();
    const oldDream = makeDream({
      id: 1,
      title: "8日前の夢",
      created_at: "2026-07-03T09:00:00+09:00", // 2026-07-12基準で8日前
    });
    render(<WeeklyDreamNewsWidget dreams={[oldDream]} profiles={[profile]} />);

    expect(screen.queryByText("「8日前の夢」")).not.toBeInTheDocument();
    expect(screen.getByText("今週はまだ夢の記録がないよ。")).toBeInTheDocument();
  });

  it("プロフィールごとに最新1件が正しく選ばれる（複数件あれば一番新しいものが出る）", () => {
    const profile = makeProfile();
    const olderDream = makeDream({
      id: 1,
      title: "古い方の夢",
      created_at: "2026-07-10T09:00:00+09:00",
    });
    const newerDream = makeDream({
      id: 2,
      title: "新しい方の夢",
      created_at: "2026-07-11T09:00:00+09:00",
    });
    render(
      <WeeklyDreamNewsWidget dreams={[olderDream, newerDream]} profiles={[profile]} />
    );

    expect(screen.getByText("「新しい方の夢」")).toBeInTheDocument();
    expect(screen.queryByText("「古い方の夢」")).not.toBeInTheDocument();
  });

  it("最新夢のtitleが空文字/未設定の場合「タイトルのない夢」を表示する", () => {
    const profile = makeProfile();
    const dream = makeDream({ title: "" });
    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[profile]} />);

    expect(screen.getByText("「タイトルのない夢」")).toBeInTheDocument();
  });

  it("感情タグを集計してトップ感情を表示する（resolveDreamEmotionNames経由）", () => {
    const profile = makeProfile();
    const dream = makeDream({
      emotions: [],
      analysis_json: { analysis: "", emotion_tags: ["たのしい"] },
    });
    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[profile]} />);

    expect(screen.getByText(/いちばん多かった きもち/)).toBeInTheDocument();
    expect(screen.getByText(/たのしい/)).toBeInTheDocument();
  });

  it("同率トップの感情タグは複数表示される（pickTopEmotionLabels経由）", () => {
    const profile = makeProfile();
    const dreamA = makeDream({
      id: 1,
      emotions: [],
      analysis_json: { analysis: "", emotion_tags: ["たのしい"] },
    });
    const dreamB = makeDream({
      id: 2,
      emotions: [],
      analysis_json: { analysis: "", emotion_tags: ["わくわく"] },
    });
    render(
      <WeeklyDreamNewsWidget dreams={[dreamA, dreamB]} profiles={[profile]} />
    );

    expect(screen.getByText(/「たのしい」と「わくわく」/)).toBeInTheDocument();
  });

  it("アクティブプロフィールは存在するが直近7日の夢が全件0件のとき、単一の空状態メッセージのみ表示する", () => {
    const profile = makeProfile();
    render(<WeeklyDreamNewsWidget dreams={[]} profiles={[profile]} />);

    expect(screen.getByText("今週のゆめニュース")).toBeInTheDocument();
    expect(screen.getByText("今週はまだ夢の記録がないよ。")).toBeInTheDocument();
    expect(screen.queryByText(profile.name, { exact: false })).not.toBeInTheDocument();
  });

  it("一部プロフィールのみ0件のとき、記録があるプロフィールのカードと個別空状態の一文を両方表示する", () => {
    const profileWithDream = makeProfile({ id: 1, name: "ねこさん" });
    const profileWithoutDream = makeProfile({ id: 2, name: "モカ" });
    const dream = makeDream({ dream_profile_id: 1 });

    render(
      <WeeklyDreamNewsWidget
        dreams={[dream]}
        profiles={[profileWithDream, profileWithoutDream]}
      />
    );

    expect(screen.getByText(/ねこさん/)).toBeInTheDocument();
    expect(
      screen.getByText("今週まだ記録がないプロフィールにも、また夢を見たら教えてね。")
    ).toBeInTheDocument();
  });

  it("アーカイブ済みプロフィールは集計・表示から除外される", () => {
    const archivedProfile = makeProfile({ id: 1, name: "アーカイブ済み", archived: true });
    const dream = makeDream({ dream_profile_id: 1 });

    render(<WeeklyDreamNewsWidget dreams={[dream]} profiles={[archivedProfile]} />);

    // アクティブプロフィールが0件になるため、コンポーネント自体が非表示
    expect(screen.queryByText("今週のゆめニュース")).not.toBeInTheDocument();
  });

  it("アクティブプロフィールが0件のとき何も描画しない", () => {
    const { container } = render(
      <WeeklyDreamNewsWidget dreams={[]} profiles={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
