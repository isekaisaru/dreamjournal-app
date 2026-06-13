# 夢の森 季節・時刻演出（Cグループ）設計

作成日: 2026-06-13
ブランチ: `feat/forest-seasonal-effects`

## 目的

夢の森（`/forest` と `/forest/[profileId]`）を、時刻と季節に応じて変化させ「世界が生きている」感を強める。前提として、A+B（PR #356）で霧・ほたる・草花・空状態は実装済み。

## スコープ（ユーザー承認済み）

含む:
1. **昼夜で空が変わる** — 方向B「ずっと幻想的」: 常に暗めの夢トーンを保ち、時刻で色相だけ寄せる
2. **季節パーティクル** — 桜（春）/ 新緑（夏・控えめ）/ 紅葉（秋）/ 雪（冬）が舞い落ちる
3. **月／星が時刻で動く** — 月の位置・星の濃さを時刻で変える

含まない（今回見送り）:
- 舞う葉（個別ツリー専用の追加演出）— 季節パーティクルで代替されるため不要
- リアルな昼夜（明るい青空＋太陽）— 方向Aは却下。夢の世界観を優先

## 設計方針

ロジックは純粋関数に切り出し、単体テストする（既存 `lib/forest.ts` / `__tests__/lib/forest.test.ts` と同じ作法）。見た目は森シーンと単独ツリーページの両方に適用し、世界観を統一する。

### 1. 新規ロジック `frontend/lib/forestAtmosphere.ts`（純粋関数）

```
type TimePhase = "dawn" | "day" | "dusk" | "night";
type Season = "spring" | "summer" | "autumn" | "winter";

getTimePhase(date: Date): TimePhase
  // hour: 5-9 dawn / 10-15 day / 16-18 dusk / それ以外 night

getSkyGradient(phase: TimePhase): string
  // 方向Bパレットの CSS linear-gradient 文字列を返す
  // dawn=薄紫 / day=青緑 / dusk=赤紫 / night=紺（現状の #241a40→#1a1336→#0e0a1c）

getSeason(date: Date): Season
  // month: 3-5 spring / 6-8 summer / 9-11 autumn / 12,1,2 winter（北半球・日本）

getCelestial(phase: TimePhase): { moonXPct: number; moonYPct: number; starOpacity: number }
  // 月の位置（夜に空を弧で移動）・星の濃さ。読込時の静的値なので reduced-motion でも安全
```

すべて入力 `Date` → 出力が決定論的な純粋関数。`new Date()` は呼び出し側で生成して渡す（テスト容易性）。

### 2. 新規コンポーネント `frontend/app/components/forest/SeasonalParticles.tsx`

- props: `{ season: Season }`
- 季節の絵文字（🌸 / 🍃 / 🍁 / ❄️）を 14〜16 個、決定論的な位置・速度で上から下へゆっくり落とす
- 夏は既存のほたるが主役なので新緑は控えめ（個数を半分程度）
- `useReducedMotion()` が true のとき: **落下アニメを止め、静止した装飾を数個だけ表示**
- `aria-hidden="true"`（装飾要素）

### 3. 既存への接続

`frontend/app/components/forest/ForestScene.tsx`:
- ハードコードの空グラデを `getSkyGradient(getTimePhase(now))` に置換（`now` はコンポーネント内で `useMemo` 生成）
- 月の位置を `getCelestial(phase)` の値に
- 星の `opacity` ベースに `starOpacity` を反映
- `<SeasonalParticles season={getSeason(now)} />` を追加

`frontend/app/forest/[profileId]/page.tsx`:
- ページ背景の固定紺グラデを同じ `getSkyGradient` に統一
- 同じく `<SeasonalParticles>` を追加

### 4. テスト `frontend/__tests__/lib/forestAtmosphere.test.ts`

- `getTimePhase`: 各時間帯の境界値（4,5,9,10,15,16,18,19 時など）
- `getSeason`: 各季節の境界月（2,3,5,6,8,9,11,12 月）
- `getSkyGradient`: 4 phase すべてで非空文字列を返し、互いに異なること
- `getCelestial`: 同じ phase なら同じ値（決定論）、night で星が濃いこと

## reduced-motion の扱い

| 要素 | 通常 | reduced-motion |
|---|---|---|
| 空の色（時間帯） | 適用 | 適用（色変化は motion でない） |
| 月／星の位置 | 適用 | 適用（読込時の静的値） |
| 星の瞬き | アニメ | 停止（既存通り） |
| 季節パーティクル落下 | アニメ | 停止・静止表示 |

## パフォーマンス

- パーティクルは 14〜16 個に制限
- 位置・遅延は決定論的（seeded）にして再描画でのレイアウトスラッシュを防ぐ
- `now` は `useMemo` で1回だけ生成（再レンダーで時刻が動かないように）

## 非対象（YAGNI）

- 分単位のなめらかな時刻補間（時間帯の4段階で十分）
- 天気（雨など）
- ユーザーが時刻・季節を手動切り替えするUI
- DesignSync 連携（CLIトークンの制約により別途 /login が必要。今回は実装優先）
