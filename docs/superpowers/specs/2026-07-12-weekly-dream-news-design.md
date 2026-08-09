# 今週のゆめニュース（WeeklyDreamNewsWidget）設計仕様

- 日付: 2026-07-12
- 対象: YumeTree フロントエンド（Next.js 16 + Tailwind v4）
- 位置づけ: `phase5-dream-profiles-design.md` / `phase5-production-verification-and-user-test.md` で挙げた7月機能候補
  （夢の木可視化 / 夢の部屋・箱庭UI / 家族の夢ニュース / シェアカード）のうち、
  brainstormingで「家族の夢ニュース」を選定・MVPスコープに絞ったもの。世界観MVP第1弾。

## 0. 方針・調査結果

**新規バックエンド変更・migrationは不要**と結論。理由:
- `GET /dreams` は `DreamFilterQuery` 経由で任意の日付範囲・`dream_profile` の eager load に既に対応済み
- `home/page.tsx` は既に**全期間の `dreams`・`profiles` を state に保持**しており、`ForestPreviewWidget` / `DreamStatsWidget` に props で渡している
- `DreamStatsWidget.tsx` には「今週の夢（直近7日）」を `dreams` 配列から算出するロジックが**既に実装済み**（同じウィンドウ定義を踏襲する）
- 感情タグ抽出は `resolveDreamEmotionNames`（`lib/dreamEmotions.ts`）が確立済み（#404の空配列バグ回避、必ずこれを使う）

→ **新規コンポーネント1つ（`app/components/WeeklyDreamNewsWidget.tsx`）を`home/page.tsx`に追加するだけで完結する。** バックエンド・DB・OpenAI・認証・Stripeには一切触れない。

## 1. コンポーネント仕様 `app/components/WeeklyDreamNewsWidget.tsx`（新規・client）

- コンポーネント名: `WeeklyDreamNewsWidget`（家族・ペット・キャラクタープロフィールなど、
  「家族」に限らないプロフィール構成でも自然に使える汎用名にする）
- props: `{ dreams: Dream[]; profiles: DreamProfile[] }`（新規バックエンドエンドポイントなし。既存APIへの
  ニュース専用取得を1回追加。`home/page.tsx` は検索・プロフィール絞り込みの影響を受けない専用の
  `weeklyNewsDreams` state を別途保持し、それを渡す。通常の夢一覧用 `dreams` state とは独立させ、
  フィルター中でもニュース集計が変わらないようにする — Codexレビュー指摘 [#423](https://github.com/isekaisaru/dreamjournal-app/pull/423) への対応）
- ユーザー向けタイトル: **「今週のゆめニュース」で固定**（プロフィール数に関わらず変えない）
- 補助文（プロフィール数で出し分け）:
  - アクティブプロフィールが1件: 「今週はこんな夢を見たよ」
  - アクティブプロフィールが2件以上: 「みんなの今週の夢を見てみよう」

### 集計ロジック（`DreamStatsWidget`と同じ7日ウィンドウを再利用）

1. `dreams` を直近7日でフィルタ。**比較演算子まで`DreamStatsWidget.tsx`の実装と完全一致させる**
   （新しく計算し直さない。将来「統計では入るのにニュースでは入らない」という差分が生まれるのを防ぐ）:
   ```ts
   const now = new Date();
   const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
   const thisWeekDreams = dreams.filter(
     (d) => new Date(d.created_at) >= weekAgo
   );
   ```
2. `profiles.filter(p => !p.archived)` でアーカイブ済みを除外（`ForestPreviewWidget`と同じ判定）
3. 各アクティブプロフィールを `dream_profile_id` でグルーピングし、直近7日分から算出:
   - 件数
   - 最新1件（`created_at` 降順の先頭）。表示タイトルは
     `latestDream.title?.trim() || "タイトルのない夢"`（空タイトルのフォールバック）
   - `resolveDreamEmotionNames` で感情タグを集計し、`getChildFriendlyEmotionLabel`で正規化した上で
     `pickTopEmotionLabels` / `formatTopEmotionLabels`（`lib/emotionTie.ts`）でトップ感情を抽出。
     `DreamStatsWidget`の週間トップ感情（`weekTopLabels`）と完全に同じ関数・同じ同率表示ルール
     （同率は全部表示・最大3つまで＋超過「など」）を再利用する（新しいロジックを作らない）

## 2. 空状態（3パターン）

- **アクティブプロフィールは存在するが、直近7日の夢が全件0件**: ウィジェット全体を
  「今週はまだ夢の記録がないよ」の単一メッセージのみにし、個別プロフィールカードは出さない
- **一部プロフィールのみ0件**: 記録があるプロフィールのカードのみ表示し、末尾に
  「今週まだ記録がないプロフィールにも、また夢を見たら教えてね。」の一文を添える
- **アクティブプロフィールが0件（全てアーカイブ済み）**: コンポーネント自体を非表示
  （`ForestPreviewWidget`の `if (active.length === 0) return null;` と同じパターン）

## 3. 配置

`home/page.tsx` の `<aside>`（`ForestPreviewWidget` → `WeeklyDreamNewsWidget` → `DreamStatsWidget` の順）。
もり（可視化）→ 今週のニュース（ナラティブ）→ 月間統計（数値）という時間軸・抽象度の並びにする。

```tsx
{!loading && profiles.length > 0 && <ForestPreviewWidget profiles={profiles} />}
{!loading && profiles.length > 0 && (
  <WeeklyDreamNewsWidget dreams={dreams} profiles={profiles} />
)}
<DreamStatsWidget dreams={dreams} />
```

新規ルートを追加しないため、認証ゲート登録（proxy.ts / AuthContext / lib/site.ts の3箇所）は不要
（既存の `/home` にそのまま乗る）。

## 4. テスト方針（Jest, component render）

`EmailVerificationBanner.test.tsx` と同様のコンポーネント単体テスト。

**現在時刻を固定する**（実行日によって「直近7日」判定が変わり、テストが不安定になるのを防ぐ）:

```ts
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-07-12T00:00:00+09:00"));
});

afterEach(() => {
  jest.useRealTimers();
});
```

テスト観点（9件）:

1. 直近7日より前の夢は集計対象外になること
2. プロフィールごとに最新1件が正しく選ばれること（複数件ある場合に一番新しいものが出る）
3. 最新夢の`title`が空文字/未設定の場合に「タイトルのない夢」が表示されること
4. 感情タグの集計（`resolveDreamEmotionNames`経由で空配列バグが起きないこと。同率トップは複数表示されること）
5. タイトルが常に「今週のゆめニュース」で固定されること
6. 補助文の出し分け: アクティブプロフィール1件→「今週はこんな夢を見たよ」/ 2件以上→「みんなの今週の夢を見てみよう」
7. アクティブプロフィールは存在するが直近7日の夢が全件0件のときの単一空状態表示（個別カードが出ないこと）
8. 一部プロフィールのみ0件のときの個別空状態の一文表示
9. アーカイブ済みプロフィールが集計・表示から除外され、かつアクティブプロフィールが0件のとき
   コンポーネントが何も描画しない（`null`相当）こと

## 5. 検証方針

### 完成条件

1. `app/components/WeeklyDreamNewsWidget.tsx` を新規作成
2. コンポーネントテスト9観点（§4）を追加
3. `home/page.tsx` の指定位置（§3）へ配置
4. `yarn test` 全緑 + スマホ表示確認

### 手動QA（配置後、ローカルDocker dev環境 or 本番デプロイ後のスマホ実機）

- [ ] スマホでカードが横にはみ出さない
- [ ] 長いプロフィール名・夢タイトルでも崩れない
- [ ] 夢が多くてもウィジェットが縦に長くなりすぎない
- [ ] アーカイブ済みプロフィールが表示されない
- [ ] 1人利用でも「家族」という不自然な表現が出ない（タイトルは「今週のゆめニュース」固定なので基本的に問題ないはずだが、実機で見た目を確認する）

集計ロジックの正しさはcomponent testで担保。バックエンド変更が無いためRSpecの追加は不要。

## 6. 境界

**触る**: `app/components/WeeklyDreamNewsWidget.tsx`（新規）/ `app/home/page.tsx`（組み込み）/ テスト（新規）。
**触らない**: バックエンド・DB migration・認証・Stripe・OpenAI API・既存コンポーネント（`ForestPreviewWidget`・
`DreamStatsWidget`は import のみで変更しない）。外部共有・別アカウント共有機能は含めない（今回のMVPスコープ外）。
