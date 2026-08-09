# ムードカレンダー（redesign-code STEP 1）設計仕様

- 日付: 2026-06-29
- 対象: YumeTree フロントエンド（Next.js 16 + Tailwind v4）
- 出典: `~/Downloads/redesign-code/components/MoodCalendar.tsx`（改善④データ可視化の最小スライス）
- 位置づけ: redesign-code の5ステップ（①カレンダー ②ストリーミング分析 ③⌘K ④サイドバー/AppShell ⑤インサイトページ）の **STEP 1（最小・低リスク）**。以降も依存順で個別PR。

## 0. 方針

参照コードは自己完結で良質。**そのまま貼らず**、実コードベースの型/import/規約に合わせて適応する。新しい色は足さない（既存Tailwindパレット）。森には触れない。提示層のみ。

## 1. コンポーネント仕様 `app/components/MoodCalendar.tsx`（新規・client）

- props: `{ dreams: Dream[]; month?: string }`（`month` 省略時は今月JST）。
- 役割: 指定月の各日を「その日の最頻感情の色」で塗るGitHub草グラフ風ヒートマップ＋曜日見出し＋凡例。
- 依存（既存資産・確認済み）:
  - `getChildFriendlyEmotionLabel`（`./EmotionTag`）で感情ラベル正規化。
  - `getJSTYearMonthKey`（`@/lib/date`）でJST月キー。
  - `Dream` 型（`@/app/types`）。集計は `d.analysis_json?.emotion_tags ?? d.emotions?.map(e=>e.name) ?? []`（DreamStatsWidgetと同じ）。
- 色: 感情カテゴリ→Tailwind（うれしい=orange-400 / たのしい=amber-400 / かなしい=sky-400 / こわい=violet-500 等、記録なし=`bg-muted`）。`border-border`/`bg-card`/`text-card-foreground`/`text-muted-foreground` でダーク自動対応。
- 集計ロジック（参照踏襲）: 月内の夢を日付(JST `en-CA` YYYY-MM-DD)ごとに感情カウント→各日の最頻感情でセル色。月初の曜日ぶん空きマス。

## 2. 配置

`app/dream/month/[yearMonth]/page.tsx` の Stats セクションと Dream list の間に追加（その月の `dreams` と `yearMonth` を渡す）。ユーザー選択＝月別ページ。ホーム右サイドバーへの追加は後続の任意スライス。

```tsx
<MoodCalendar dreams={dreams} month={yearMonth} />
```

## 3. テスト方針（TDD・component render）

`@testing-library/react` + jest。
- 曜日見出し（日〜土）が描画される。
- 夢のある日が `bg-muted`(記録なし) ではなく感情色セルになる（最頻感情→色）。
- 凡例が描画される。
- 既存スイートが緑のまま。

## 4. 検証方針

- ゲート: `yarn jest` 全緑 + `yarn build` 成功（既存 forest tsc エラーは無関係）。
- 配置先（月別ページ）は認証ページのため、配置後の発色は手動QA。ヒートマップの構造/色はcomponent testで担保。

## 5. 境界

**触る**: `app/components/MoodCalendar.tsx`（新規）/ `app/dream/month/[yearMonth]/page.tsx`（組み込み）/ テスト。
**触らない**: 認証/ルーティング/Stripe/DB/森/他STEP（②〜⑤は後続PR）。
