# モルペウス画像アセット配置ガイド

このPRでは、添付画像のモルペウスをアプリ画面に配置するためのコードを追加しています。

## 現在の実装方針

`MorpheusImage.tsx` に、添付画像を軽量化した JPEG data URL として直接内包しています。

以前は以下のように `frontend/public/images/morpheus/` 配下の画像ファイルを参照する設計でした。

```text
frontend/public/images/morpheus/
  morpheus-home.jpg
  morpheus-compose.jpg
  morpheus-voice.jpg
  morpheus-analysis.jpg
  morpheus-empty.jpg
  morpheus-praise.jpg
```

しかし、画像ファイルの配置漏れがあると本番で SVG フォールバックが表示され、添付画像の可愛さが反映されませんでした。

そのため、現時点では画像配置作業を不要にするため、`MorpheusImage.tsx` に data URL を埋め込んでいます。

## 画面ごとの使い分け

| variant | 用途 | 主な配置先 |
|---|---|---|
| `home` | 手を振る案内役 | `/home` のヒーロー |
| `compose` | 夢を書く案内 | `/dream/new`、フォーム上部 |
| `voice` | 音声を聞く案内 | 音声入力ボタン |
| `analysis` | 夢を読み解く | 分析中、分析結果 |
| `empty` | 夢待ち・空状態 | 夢が0件の空状態 |
| `praise` | ほめる・達成 | 夢詳細、達成演出 |

## 実装方針

- `MorpheusImage` コンポーネントで画像 data URL と alt を集約します。
- `MorpheusHero` は `MorpheusImage` を使って、大きいモルペウス画像を表示します。
- 既存の `MorpheusSVG` はすぐ削除せず、小さいフローティング補助や将来のフォールバックとして残します。

## 将来的な改善案

画像容量やキャッシュ効率をより良くしたい場合は、GitHub に画像ファイルを直接追加できる環境で、data URL から `frontend/public/images/morpheus/` 配置へ戻すのが理想です。

ただし、今は「本番で確実に添付画像を表示する」ことを優先して、data URL 方式にしています。

## 確認ポイント

- `/home` のヒーローで添付画像のモルペウスが大きく表示されること。
- `/dream/new` の上部で夢を書くモルペウスが表示されること。
- 音声入力ボタン付近でマイクのモルペウスが表示されること。
- 夢が0件の空状態で寝そべりモルペウスが表示されること。
- 本番でも SVG ではなく添付画像版モルペウスが表示されること。
