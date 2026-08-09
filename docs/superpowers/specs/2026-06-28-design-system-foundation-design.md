# デザインシステム基盤（サブPJ #0）設計仕様

- 日付: 2026-06-28
- 対象: YumeTree フロントエンド（Next.js 15 App Router + Tailwind v4 + shadcn/ui）
- 位置づけ: 全画面リデザイン（Morpheus主役化）の依存ルート。**この#0は既存画面の見た目を壊さない（加算・非破壊）**。
- 後続: #1 Morpheusヒーロー基盤 / #2 ナビゲーション / #3 画面適用 / #4 森画面（最後・別PR）

## 0. 背景と方針

7月OBL計画の「大規模デザインリニューアルはやらない」を、ユーザーが意図的に上書きする判断（世界観リデザインを当面の主軸にする）。ただし安全策として **森画面・認証・DB・Stripe に触れる変更はそれぞれ独立PRに分割**し、一気に壊さない。

#0 のゴール: 「朝の空＋月のMorpheus」という世界観を、言葉と再利用可能なトークンに固め、以降の全画面が同じ言語で書ける状態を作る。

## 1. デザイン原則

1. **空＝時刻で変わる**: ページ背景は時刻連動（深夜=夜空 / 朝=白→淡青 / 昼=淡青 / 夕夜=夕焼け）。ダークモードの正は「夜空」。
2. **Morpheusが主役**: 紫髪・星ナイトキャップのチビキャラ（実画像10枚）が全画面の主役。月モチーフの自作SVGは画像読込失敗時のフォールバックに限定。
3. **後光と浮遊で存在感**: ヒーロー配置は中央寄せ＋`morpheus-float`。能動状態（傾聴・処理中）は `moon-pulse` 後光。
4. **後光の光源色はテーマ連動**: 朝＝白い背景では琥珀後光は見えないため、後光色はテーマで切替（明=紫/sky、夜=月の琥珀）。
5. **感情色は単一の出典**: `EmotionTag.tsx` の10色を唯一の出典とし、トークン化して横展開する。

## 2. トークン仕様

### 2.1 既存（据え置き・lightテーマ `:root`）
変更しない。世界観の正準値。

| トークン | 値 | 意味 |
|---|---|---|
| `--background` | `214 60% 97%` | 朝のうすい空 |
| `--foreground` | `222 47% 15%` | ネイビー文字 |
| `--card` | `0 0% 100%` | 白カード |
| `--primary` | `262 83% 58%` | 紫＝Morpheus |
| `--secondary` | `217 91% 60%` | 青＝空 |
| `--accent` | `142 71% 45%` | 緑＝芽・木 |
| `--muted` | `214 35% 93%` | 空色ミュート |

### 2.2 追加（#0で加算・非破壊／未使用でも害なし）

**Morpheusサイズスケール（確定）**
```
--morpheus-sm:    48px
--morpheus-md:    72px
--morpheus-lg:    108px
--morpheus-hero:  clamp(120px, 36vw, 160px)   /* モバイル~120, 上限160 */
```
注: ヒーローはモバイル(390px幅カード)で160px固定だと大きすぎるため、`clamp`で可変にする。

**グロー（後光）— 光源色はテーマ連動**
```
--glow-moon:      251 191 36   /* 月の琥珀（夜空で映える） */
--glow-sky:       56 189 248   /* 空の水色 */
--glow-morpheus:  var(--primary)  /* 紫 */
--glow-active:    var(--glow-morpheus)  /* lightの既定。.dark で --glow-moon に上書き */
```
`moon-pulse` の `box-shadow` 色は固定琥珀をやめ `rgb(var(--glow-active) / α)` 参照にする。明テーマで後光が見える状態を保証する。

**感情カラー（`--emotion-*`、EmotionTag.tsx を正として抽出）**

> ⚠️ 当初表で「うれしい/たのしい」の色が逆だった。実コード（`getEmotionTone`）で確定した正しい対応:

| トークン | 感情 | 出典(Tailwind) | hex |
|---|---|---|---|
| `--emotion-happy` | うれしい | orange-500 | #f97316 |
| `--emotion-fun` | たのしい | amber-500 | #f59e0b |
| `--emotion-touched` | じーんとした | rose-500 | #f43f5e |
| `--emotion-angry` | おこってる | red-500 | #ef4444 |
| `--emotion-scared` | こわい | purple-600 | #9333ea |
| `--emotion-worried` | しんぱい | indigo-400 | #818cf8 |
| `--emotion-sad` | かなしい | blue-500 | #3b82f6 |
| `--emotion-relieved` | ほっとした | emerald-500 | #10b981 |
| `--emotion-surprised` | びっくり | yellow-500 | #eab308 |
| `--emotion-unknown` | わからない | slate-500 | #64748b |

注: `--emotion-joy` のような英語名は fun/happy の取り違えの温床になるため使わない。命名は上記固定。
#0ではトークン**定義のみ**。`EmotionTag.tsx` の実差し替えは「見た目が同値」を保ったまま別PR（#3系）で行う。

**時刻連動 空トーン（`getToneClassByHour` を正式ルール化）**

| 時間帯 | トーン | グロー |
|---|---|---|
| 0–5 深夜 | 夜空ネイビー `rgba(15,23,42)→(30,41,59)` | sky |
| 6–10 朝 | 白→淡青 `rgba(255,255,255)→(239,246,255)` | 月(amber) |
| 11–16 昼 | 淡青 `rgba(248,250,252)→(224,242,254)` | sky |
| 17–23 夕夜 | 夕焼け `rgba(255,247,237)→(254,215,170)` | orange |

`--sky-night / --sky-dawn / --sky-day / --sky-dusk` として言語化。ダークモードの正＝夜空(`222 45% 11%`)はこれに紐づく。**実値変更（globals.cssのダーク2系統の統合）は別PJ。#0は方針記述のみ。**

**モーション（既存を正として明文化・変更なし）**
`morpheus-float 6s` / `moon-pulse 3.5s` / `star-twinkle 2s` / `fade-up` / `scale-in` / `book-open` / `morpheus-entry`。

## 3. Morpheus運用ルール早見表

| 画面 | variant | 表情(fallback) | サイズ | 後光 | アニメ |
|---|---|---|---|---|---|
| 表紙/Landing | `landing` | cheerful | hero (clamp) | あり | float+entry |
| ホーム中央ヒーロー | `home` | cheerful | hero (clamp) | あり | float |
| 音声記録（傾聴中） | `voice` | curious | lg108 | パルス(moon-pulse) | float |
| 夢を書く | `compose` | dreaming | md72 | 弱 | float |
| 詳細（分析アバター） | `analysis` | curious | **sm48〜56**（円クロップ） | なし | fade-up |
| インサイト/週次 | `reward` | proud | lg108 | あり | scale-in |
| 空状態 | `empty` | sleeping | lg108 | 弱 | float |
| 検索 | `search` | curious | sm48 | なし | — |
| 設定 | `settings` | — | sm48 | なし | — |
| ログイン/おかえり | `login` | cheerful | md72 | あり | float |

原則:
1. 「傾聴・処理中」の能動状態は必ず `moon-pulse`（後光色はテーマ連動）。
2. ヒーロー配置は中央寄せ＋`morpheus-float`、サイズは `--morpheus-hero`（clamp）。
3. 画像読込失敗時は `MorpheusSVG` の表情にフォールバック（既存実装を踏襲）。
4. 詳細の分析アバターはヘッダー内要素なので 48〜56 の円クロップに抑える（72はcompose等の主役画面に温存）。

## 4. 成果物と境界

**#0で実装するコード（非破壊）**
- `app/globals.css` の `@theme` に 2.2 のトークンを**追加**（既存値は不変更）。
- `moon-pulse` の box-shadow 色を `--glow-active` 参照に変更（明テーマで後光が見える化）。これは唯一の「既存挙動への微変更」で、見た目は後光が見えるようになる方向の改善。

**#0で実装しないもの（後続へ）**
- Morpheusヒーロー共有コンポーネント → #1
- BottomTabBar/FAB → #2
- `EmotionTag.tsx` のトークン差し替え・各画面適用 → #3
- 森画面 → #4
- ダークモード2系統の実値統合 → 別PJ

**ドキュメント成果物**
- 本仕様書
- 実値で描く「生きたHTMLスタイルガイド」（トークン・感情色・Morpheus早見表のビジュアル版）

## 5. テスト/検証方針

- #0はトークン追加が中心のため、`yarn build` が通ること・既存 Jest（278件）が緑のままを回帰ゲートにする。
- 追加トークンが未参照でもビルドは通る（Tailwind v4 `@theme` 変数定義）。
- `moon-pulse` 変更後、light/dark 双方で後光が視認できることを目視（preview）で確認。

## 6. 既知の注意（#3で扱う）

- 感情色を「ベタ塗り背景＋白文字」で使う箇所のコントラスト: 琥珀(amber)/黄(yellow)系は白文字がAAボーダーライン。#0では現状維持（既存と同値）。**#3で実際に使う際にWCAG AAを確認**し、必要なら濃色側 or 文字色を調整する。
