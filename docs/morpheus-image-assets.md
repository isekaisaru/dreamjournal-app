# モルペウス画像アセット配置ガイド

このPRでは、添付画像のモルペウスをアプリ画面に配置するためのコードを追加しています。

## 画像配置先

以下の6ファイルを `frontend/public/images/morpheus/` に配置してください。

```text
frontend/public/images/morpheus/
  morpheus-home.jpg
  morpheus-compose.jpg
  morpheus-voice.jpg
  morpheus-analysis.jpg
  morpheus-empty.jpg
  morpheus-praise.jpg
```

## 画面ごとの使い分け

| ファイル | 用途 | 主な配置先 |
|---|---|---|
| `morpheus-home.jpg` | 手を振る案内役 | `/home` のヒーロー |
| `morpheus-compose.jpg` | 夢を書く案内 | `/dream/new`、フォーム上部 |
| `morpheus-voice.jpg` | 音声を聞く案内 | 音声入力ボタン |
| `morpheus-analysis.jpg` | 夢を読み解く | 分析中、分析結果 |
| `morpheus-empty.jpg` | 夢待ち・空状態 | 夢が0件の空状態 |
| `morpheus-praise.jpg` | ほめる・達成 | 夢詳細、達成演出 |

## 実装方針

- `MorpheusImage` コンポーネントで画像パスと alt を集約します。
- `MorpheusHero` は `MorpheusImage` を使って、大きいモルペウス画像を表示します。
- 既存の `MorpheusSVG` はすぐ削除せず、フローティング補助やフォールバックとして残します。

## 確認ポイント

- `/home` のヒーローで `morpheus-home.jpg` が大きく表示されること。
- `/dream/new` の上部で `morpheus-compose.jpg` が表示されること。
- 音声入力ボタン付近で `morpheus-voice.jpg` が表示されること。
- 画像未配置の場合はブラウザで 404 になるため、マージ前に画像ファイルを必ず配置してください。
