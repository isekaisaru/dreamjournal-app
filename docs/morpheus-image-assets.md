# モルペウス画像アセット配置ガイド

## 現在の実装方針

画像ファイルを `frontend/public/images/morpheus/` に正式配置し、
`MorpheusImage.tsx` が Next.js `Image` 経由で `/images/morpheus/*.jpg` を参照する方式を採用しています。

> **注:** data URL 埋め込み方式は廃止しました。
> Codex P1 指摘（不正な base64 によるデコード失敗リスク）を受け、
> Next.js の正式な静的アセット管理に戻しています。

## 配置ファイル一覧

```text
frontend/public/images/morpheus/
  morpheus-home.jpg
  morpheus-landing.jpg
  morpheus-compose.jpg
  morpheus-voice.jpg
  morpheus-analysis.jpg
  morpheus-empty.jpg
  morpheus-praise.jpg
  morpheus-search.jpg
  morpheus-settings.jpg
  morpheus-reward.jpg
```

各ファイルは 200KB 未満を目安に軽量化します。2026-05-09時点では全10枚が 180KB 未満です。

## 画面ごとの使い分け

| variant | 用途 | 主な配置先 |
|---|---|---|
| `home` | 手を振る案内役 | `/home` のヒーロー |
| `compose` | 夢を書く案内 | `/dream/new`、フォーム上部 |
| `voice` | 音声を聞く案内 | 音声入力ボタン |
| `analysis` | 夢を読み解く | 分析中、分析結果 |
| `empty` | 夢待ち・空状態 | 夢が0件の空状態 |
| `praise` | ほめる・達成 | 夢詳細、達成演出 |
| `landing` | 初回案内 | ランディング、ログイン |
| `login` | おかえり案内 | ログイン（`landing` 画像を再利用） |
| `search` | 夢の検索 | 検索・絞り込み周辺 |
| `settings` | 設定案内 | 設定画面 |
| `reward` | 達成・報酬 | トライアル上限、アップグレード導線 |

## フォールバック

画像が読み込めなかった場合（ファイル欠損・ネットワーク障害など）は、
`onError` ハンドラが `hasImageError` を `true` にセットし、
`MorpheusSVG` を表情付きで自動表示します。

| variant | フォールバック表情 |
|---|---|
| `home` | `cheerful` |
| `compose` | `dreaming` |
| `voice` | `curious` |
| `analysis` | `curious` |
| `empty` | `sleeping` |
| `praise` | `proud` |
| `landing` | `cheerful` |
| `login` | `cheerful` |
| `search` | `curious` |
| `settings` | `cheerful` |
| `reward` | `proud` |

## 実装構成

- `MorpheusImage.tsx` — バリアント別の画像パス・alt・フォールバック表情を管理し、Next.js `Image` で表示する共通コンポーネント
- `MorpheusHero.tsx` — `MorpheusImage` を使って大きいモルペウス画像を表示
- `MorpheusSVG.tsx` — SVG 版モルペウス。画像読み込み失敗時のフォールバックとして継続利用

## 画像を差し替えるには

1. `frontend/public/images/morpheus/` の該当ファイルを上書き
2. ファイル名・拡張子（`.jpg`）をコードと完全一致させること
3. 差し替え後に `ls -lh frontend/public/images/morpheus/` で各画像が 200KB 未満か確認すること

NG 例: `morpheus_home.jpg` / `morpheus-home.jpeg` / `Morpheus-home.jpg`

## 確認ポイント

- `/home` のヒーローで画像版モルペウスが大きく表示されること
- `/dream/new` の上部で夢を書くモルペウスが表示されること
- 音声入力ボタン付近でマイクのモルペウスが表示されること
- 夢が0件の空状態で空状態モルペウスが表示されること
- 画像ファイルを削除した場合に MorpheusSVG にフォールバックされること
