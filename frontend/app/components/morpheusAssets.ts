/**
 * Morpheus 画像アセットの単一出典（variant → 画像/altテキスト）。
 * MorpheusImage（全身）と MorpheusAvatar（顔クロップ）が共有する。
 */

export type MorpheusImageVariant =
  | "home"
  | "compose"
  | "voice"
  | "analysis"
  | "empty"
  | "praise"
  | "landing"
  | "login"
  | "search"
  | "settings"
  | "reward";

export const MORPHEUS_IMAGE_SRC: Record<MorpheusImageVariant, string> = {
  // 既存の6枚: YumeTreeの主要フロー
  home: "/images/morpheus/morpheus-home.jpg",
  compose: "/images/morpheus/morpheus-compose.jpg",
  voice: "/images/morpheus/morpheus-voice.jpg",
  analysis: "/images/morpheus/morpheus-analysis.jpg",
  empty: "/images/morpheus/morpheus-empty.jpg",
  praise: "/images/morpheus/morpheus-praise.jpg",

  // 追加の4枚: 画面別に使う新規モルペウス
  landing: "/images/morpheus/morpheus-landing.jpg",
  login: "/images/morpheus/morpheus-landing.jpg",
  search: "/images/morpheus/morpheus-search.jpg",
  settings: "/images/morpheus/morpheus-settings.jpg",
  reward: "/images/morpheus/morpheus-reward.jpg",
};

export const ALT_BY_VARIANT: Record<MorpheusImageVariant, string> = {
  home: "ホーム画面で見守るモルペウス",
  compose: "夢を書く場面で応援するモルペウス",
  voice: "マイクの前で夢の話を聞いているモルペウス",
  analysis: "夢の本を読んで分析しているモルペウス",
  empty: "月と雲の上で次の夢を待っているモルペウス",
  praise: "星を掲げて夢の記録をほめるモルペウス",
  landing: "月を手に持ってYumeTreeへ案内するモルペウス",
  login: "おかえりと迎えてくれるモルペウス",
  search: "虫眼鏡で夢の記録を探しているモルペウス",
  settings: "魔法の筆とパレットで設定を案内するモルペウス",
  reward: "星のトロフィーを掲げてほめるモルペウス",
};
