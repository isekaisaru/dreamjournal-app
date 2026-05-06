# PageSpeed Insights 計測記録

**計測日:** 2026-05-07 04:41 JST
**対象URL:** https://dreamjournal-app.vercel.app
**デバイス:** スマートフォン（Moto G Power エミュレーション / 低速4G）
**Lighthouse:** 13.0.1

## スコア

| 指標 | スコア |
|---|---|
| パフォーマンス | 64 |
| ユーザー補助 | 94 |
| おすすめの方法 | 100 |
| SEO | 100 |

## Core Web Vitals

| 指標 | 計測値 | 目標 | 判定 |
|---|---|---|---|
| FCP (First Contentful Paint) | 3.5秒 | 1.8秒以下 | 要改善 |
| LCP (Largest Contentful Paint) | 7.0秒 | 2.5秒以下 | 要改善 |
| TBT (Total Blocking Time) | 170ms | 200ms以下 | 良好 |
| CLS (Cumulative Layout Shift) | 0 | 0.1以下 | 完璧 |
| Speed Index | 5.2秒 | 3.4秒以下 | 要改善 |

## 主な改善候補

| 問題 | 推定削減 | 優先度 |
|---|---|---|
| レンダリングブロックリクエスト | 3,580ms | S |
| 画像配信の改善 | 418 KiB | A |
| 未使用JavaScript | 81 KiB | B |
| 未使用CSS | 32 KiB | C |

## ユーザー補助の課題

- 背景色と前景色のコントラスト比が不十分
- 見出し要素の降順が崩れている箇所あり

## セキュリティ（おすすめの方法 指摘）

- CSP（Content Security Policy）未設定
- COOP（Cross-Origin Opener Policy）未設定
- XFO（クリックジャッキング対策）未設定

## 良かった点

- CLS = 0（レイアウトシフト完全ゼロ）
- SEO 100 / おすすめの方法 100
- TBT 170ms（200ms以内をクリア）
