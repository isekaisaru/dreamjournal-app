# モルペウス画面別配置マップ

このドキュメントは、YumeTree内でどのモルペウス画像をどの画面に配置するかを整理したものです。

## 目的

これまで、以下のようにモルペウス表示が混在していました。

- 旧 `MorpheusSVG`
- 旧 `/images/morpheus.png`
- 新しい画面別 `MorpheusImage`

そのため、画面によって可愛さや統一感に差がありました。

今回の修正では、主要画面を `MorpheusImage` に寄せ、画面の役割に合った画像を使い分けます。

## 既存6枚

| variant | ファイル | 用途 |
|---|---|---|
| `home` | `morpheus-home.jpg` | ホームの大きなヒーロー |
| `compose` | `morpheus-compose.jpg` | 夢を書く画面 |
| `voice` | `morpheus-voice.jpg` | 音声入力 |
| `analysis` | `morpheus-analysis.jpg` | 分析中・月別サマリー |
| `empty` | `morpheus-empty.jpg` | 夢が0件の空状態 |
| `praise` | `morpheus-praise.jpg` | ほめる・達成 |

## 追加4枚

| variant | ファイル | 用途 |
|---|---|---|
| `landing` | `morpheus-landing.jpg` | ランディング・ログインのお迎え |
| `login` | `morpheus-landing.jpg` | ログインのおかえり表示。まずは landing と共用 |
| `search` | `morpheus-search.jpg` | 検索・夢クエスト |
| `settings` | `morpheus-settings.jpg` | 設定・保護者メニュー |
| `reward` | `morpheus-reward.jpg` | 達成・ほめる・CTA |

## 主な変更箇所

| 画面/部品 | 変更前 | 変更後 |
|---|---|---|
| `/` LandingPage 上部 | `/images/morpheus.png` | `MorpheusImage variant="landing"` |
| `/` LandingPage 下部 CTA | `/images/morpheus.png` | `MorpheusImage variant="reward"` |
| 右下ガイド | `MorpheusSVG` | `MorpheusImage` |
| ログイン上部 | `MorpheusSmall` 内の `MorpheusSVG` | `MorpheusImage variant="login"` |
| `/home` Dream Adventure | `MorpheusSVG` | `MorpheusImage` |
| 月別サマリー | `/images/morpheus.png` | `MorpheusImage variant="analysis"` |
| 設定/保護者メニュー | 画像なし | `MorpheusImage variant="settings"` |

## 画像ファイル配置

追加4枚は以下に配置します。

```text
frontend/public/images/morpheus/
  morpheus-landing.jpg
  morpheus-search.jpg
  morpheus-settings.jpg
  morpheus-reward.jpg
```

既存6枚と合わせると、最終的に以下の10枚になります。

```text
frontend/public/images/morpheus/
  morpheus-home.jpg
  morpheus-compose.jpg
  morpheus-voice.jpg
  morpheus-analysis.jpg
  morpheus-empty.jpg
  morpheus-praise.jpg
  morpheus-landing.jpg
  morpheus-search.jpg
  morpheus-settings.jpg
  morpheus-reward.jpg
```

## 確認ポイント

- `/` の上部と下部が旧 `morpheus.png` ではなく画像版になっていること
- `/login` の小型ガイドと右下ガイドが旧SVGではなく画像版になっていること
- `/home` のヒーローと Dream Adventure が画像版になっていること
- `/settings` の上部に設定用モルペウスが出ること
- `/dream/month/:yearMonth` の月別サマリーが分析用モルペウスになること
