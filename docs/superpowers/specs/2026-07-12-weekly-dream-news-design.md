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
- props: `{ dreams: Dream[]; profiles: DreamProfile[] }`（新規API呼び出しなし。`home/page.tsx` が
  既に保持している state をそのまま渡す）
- ユーザー向けタイトル: **「今週のゆめニュース」で固定**（プロフィール数に関わらず変えない）
- 補助文（プロフィール数で出し分け）:
  - アクティブプロフィールが1件: 「今週はこんな夢を見たよ」
  - アクティブプロフィールが2件以上: 「みんなの今週の夢を見てみよう」

### 集計ロジック（`DreamStatsWidget`と同じ7日ウィンドウを再利用）

1. `dreams` を直近7日（`DreamStatsWidget`と同じ `now - 7日` 基準）でフィルタ
2. `profiles.filter(p => !p.archived)` でアーカイブ済みを除外（`ForestPreviewWidget`と同じ判定）
3. 各アクティブプロフィールを `dream_profile_id` でグルーピングし、直近7日分から算出:
   - 件数
   - 最新1件（`created_at` 降順の先頭。タイトル・本文冒頭は使わずタイトルのみ表示）
   - `resolveDreamEmotionNames` で感情タグを集計し、`getChildFriendlyEmotionLabel`で正規化した上で
     `pickTopEmotionLabels` / `formatTopEmotionLabels`（`lib/emotionTie.ts`）でトップ感情を抽出。
     `DreamStatsWidget`の週間トップ感情（`weekTopLabels`）と完全に同じ関数・同じ同率表示ルール
     （同率は全部表示・最大3つまで＋超過「など」）を再利用する（新しいロジックを作らない）

## 2. 空状態（3パターン）

- **全プロフィール0件**: ウィジェット全体を「今週はまだ夢の記録がないよ」の単一メッセージのみにし、
  個別プロフィールカードは出さない
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

- 直近7日より前の夢は集計対象外になること
- プロフィールごとに最新1件が正しく選ばれること（複数件ある場合に一番新しいものが出る）
- 感情タグの集計（`resolveDreamEmotionNames`経由で空配列バグが起きないこと。同率トップは複数表示されること）
- タイトルが常に「今週のゆめニュース」で固定されること
- 補助文の出し分け: アクティブプロフィール1件→「今週はこんな夢を見たよ」/ 2件以上→「みんなの今週の夢を見てみよう」
- 全プロフィール0件のときの単一空状態表示（個別カードが出ないこと）
- 一部プロフィールのみ0件のときの個別空状態の一文表示
- アーカイブ済みプロフィールが集計・表示から除外されること
- アクティブプロフィールが0件のときコンポーネントが何も描画しない（`null`相当）こと

## 5. 検証方針

- ゲート: `yarn test` 全緑
- ホームページへの組み込みは認証ページのため、実際の見た目は手動QA
  （ローカルDocker dev環境 or 本番デプロイ後のスマホ実機）
- 集計ロジックの正しさはcomponent testで担保。バックエンド変更が無いためRSpecの追加は不要

## 6. 境界

**触る**: `app/components/WeeklyDreamNewsWidget.tsx`（新規）/ `app/home/page.tsx`（組み込み）/ テスト（新規）。
**触らない**: バックエンド・DB migration・認証・Stripe・OpenAI API・既存コンポーネント（`ForestPreviewWidget`・
`DreamStatsWidget`は import のみで変更しない）。外部共有・別アカウント共有機能は含めない（今回のMVPスコープ外）。
