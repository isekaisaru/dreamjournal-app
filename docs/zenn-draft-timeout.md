# 【下書き】個人開発で gpt-image-1 の 502 エラーを直した記録 — タイムアウト3層設計の全容

> 公開予定: 2026年4月〜5月
> 関連 PR: #164（フロント）/ #165（バックエンド）

---

## 0. この記事で伝えること（要約）

- 個人開発アプリで画像生成 API（gpt-image-1）を呼ぶと 502 Bad Gateway が出た
- 原因は Puma の worker_timeout がデフォルト 60 秒だったこと
- フロント・OpenAI クライアント・Puma の 3 層でタイムアウトを設計して解決した
- Codex のレビューで `Faraday::TimeoutError` が素通りする問題も発見・修正した

---

## 1. はじめに：何が起きたか

- gpt-image-1 は処理に最大 60 秒かかる
- リクエスト後 60 秒で Puma がワーカーを強制終了 → サーバー再起動 → ブラウザに 502
- 「成功したり失敗したりする」「ログが途中で途切れる」が最初の手がかり

---

## 2. 原因調査：ログで何が見えたか

- Render のログで再起動タイミングを確認した方法
- `worker_timeout` のデフォルト値（60 秒）がどこで決まっているか
- 開発環境では `worker_timeout 3600`（無制限）なので気づきにくい

---

## 3. タイムアウト3層設計

```
フロント fetch: 60 秒
  ↓
OpenAI クライアント request_timeout: 55 秒
  ↓
Puma worker_timeout: 90 秒（本番のみ）
```

### なぜこの順番か

- OpenAI クライアントが先に切れれば Rails 側でエラーハンドリングできる
- Puma は OpenAI より長くして「Rails が正常に rescue できる時間」を確保する
- フロントはどちらかが先に応答すれば OK なので 60 秒で十分

### コード: puma.rb

```ruby
worker_timeout 90 if ENV.fetch("RAILS_ENV", "development") == "production"
```

### コード: openai.rb

```ruby
$openai_client = OpenAI::Client.new(
  access_token: ENV['OPENAI_API_KEY'],
  request_timeout: 55
)
```

---

## 4. Codex が見つけた穴：Faraday::TimeoutError が 500 になる

- `request_timeout: 55` が発火するのは `Faraday::TimeoutError`
- `rescue OpenAI::Error` では捕捉されない → `rescue StandardError` に落ちて 500 になる
- 正しいのは `rescue Faraday::TimeoutError, Net::ReadTimeout, Net::OpenTimeout`

### コード: dreams_controller.rb

```ruby
rescue Faraday::TimeoutError, Net::ReadTimeout, Net::OpenTimeout => e
  render json: { error: "画像の生成に時間がかかりすぎました。" }, status: :gateway_timeout
rescue OpenAI::Error => e
  render json: { error: "画像の生成に失敗しました。" }, status: :unprocessable_entity
rescue StandardError => e
  render json: { error: "画像の生成に失敗しました。" }, status: :internal_server_error
```

---

## 5. デプロイ直後に 502 が出た罠

- PR マージ直後に本番テストすると Render がまだ再起動中のことがある
- ログで「サーバー起動完了」のタイミングを確認してから再試行が必要
- 修正の効果か、デプロイ中の一時 502 かを区別する方法

---

## 6. gpt-image-1 移行と b64_json フォールバック

- dall-e-3 は 2026-05-12 廃止予定
- gpt-image-1 は `url` が返らないケースがある → `b64_json` でフォールバック

```ruby
image_url = response.dig("data", 0, "url")
if image_url.nil?
  b64 = response.dig("data", 0, "b64_json")
  image_url = "data:image/png;base64,#{b64}" if b64.present?
end
```

---

## 7. まとめ・面接で語れるポイント

- タイムアウトは「外側が長く、内側が短く」が基本設計
- 例外クラスの継承ツリーを知らないと正しく rescue できない
- Codex などのコードレビュー AI はこういうレイヤーの問題を指摘してくれる

---

## TODO（執筆前に確認すること）

- [ ] Zenn アカウントで下書き保存
- [ ] コードスニペットを最終 PR の差分と照合
- [ ] スクリーンショット: 502 エラー / 本番で画像生成成功
- [ ] 公開前に README のリンク追記を忘れない
