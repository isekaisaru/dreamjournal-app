# 【下書き】個人開発で gpt-image-1 の 502 エラーを直した記録 — タイムアウト3層設計の全容

> 公開予定: 2026年4月〜5月
> 関連 PR: #164（フロント）/ #165（バックエンド）

---

## 0. この記事で伝えること（要約）

個人開発アプリに画像生成（gpt-image-1）を実装したところ、本番環境で断続的に **502 Bad Gateway** が発生しました。

原因は **Puma の `worker_timeout` がデフォルト60秒**だったこと。gpt-image-1 の処理時間がギリギリ超えるケースで、Pumaがワーカーを強制終了していました。

この記事では以下の3点を解説します。

1. **タイムアウト3層設計**（フロント60秒 > OpenAI 55秒 > Puma 90秒）で502を根本解決した方法
2. **`Faraday::TimeoutError` が `rescue OpenAI::Error` をすり抜けて500になる**という例外継承ツリーの落とし穴と修正
3. **デプロイ直後の502**が「修正失敗」ではなく「サーバー再起動中」だったと気づいた方法

「ローカルでは動くのに本番で落ちる」を経験したことがある方に刺さる内容です。

---

## 1. はじめに：何が起きたか

個人開発アプリ「ユメログ」に、夢の内容から画像を生成する機能を実装しました。使用したのは OpenAI の `gpt-image-1` です。

ローカルでは動いた。本番にデプロイした。ボタンを押した。

**数十秒後、画面に `502 Bad Gateway` が出た。**

最初は「本番環境の設定ミスか」と思いました。しかし再試行すると成功することもある。ログを見ると、リクエストが届いた記録はあるのにレスポンスが途切れている。「壊れているのか、壊れていないのかわからない」という、一番やっかいな状態でした。

手がかりは2つでした。

1. **エラーが出るタイミングが60秒前後で一定している**
2. **Renderのログに「Puma がワーカーを再起動した」という記録がある**

この2点が揃ったとき、原因が見えてきました。

---

## 2. 原因調査：ログで何が見えたか

### Render のログで確認したこと

Render のダッシュボードで「Logs」タブを開き、リクエストが届いた時刻とサーバー再起動の時刻を並べました。するとほぼ同時刻に `worker timeout` の文字が出ていました。

```
[Puma] Worker 0: timeout (60s), killing.
[Puma] Worker 0 (PID: xxxx) booted in 0.1s, phase: 0
```

### `worker_timeout` のデフォルト値

Puma には `worker_timeout` という設定があり、**1リクエストが指定秒数以内に完了しなければワーカーを強制終了する**という仕組みです。デフォルトは **60 秒**。

`gpt-image-1` は画像生成に最大60秒かかります。つまり、ギリギリ間に合わないケースで Puma が先にワーカーを落としていた。それが 502 の原因でした。

### なぜローカルでは気づかなかったか

Puma の開発用設定 (`config/puma.rb`) には次の記述があります。

```ruby
# development では worker_timeout を事実上無制限にする
worker_timeout 3600
```

ローカルでは `3600 秒 = 1時間` のため、どれだけ時間がかかっても落ちません。本番に上げて初めて 60 秒の壁にぶつかりました。**「ローカルで動く＝本番で動く」が成立しない典型パターンです。**

---

## 3. タイムアウト3層設計

原因がわかれば、設計は単純です。「どこで何秒待つか」を3層で決めます。

```
フロント fetch: 60 秒
  ↓
OpenAI クライアント request_timeout: 55 秒
  ↓
Puma worker_timeout: 90 秒（本番のみ）
```

### なぜこの順番か

**設計の基本は「内側が短く、外側が長く」です。**

| 層 | 設定値 | 役割 |
|----|--------|------|
| OpenAI クライアント | 55 秒 | OpenAI が応答しない場合、Railsが先に`rescue`できるようにする |
| Puma worker_timeout | 90 秒 | `rescue`してレスポンスを返す時間を確保する（OpenAIより長く） |
| フロント fetch | 60 秒 | Rails からの応答（成功 or エラー）を待てば十分 |

もし Puma を 60 秒のままにしていたら、OpenAI の処理中に Puma がワーカーを落とすため、Rails で `rescue` する機会がありません。Puma を 90 秒にすることで「OpenAI が 55 秒でタイムアウト → Rails が rescue してエラーレスポンスを返す → Puma は90秒まで余裕があるので落ちない」という順番が成立します。

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

タイムアウト3層設計を実装した後、GitHub Copilot の後継ツールである **Codex** にコードレビューを依頼しました。そこで指摘されたのが「例外クラスの継承ツリー」の問題です。

### 問題：rescue の順番と対象クラスが間違っていた

`openai-ruby` gem の `request_timeout` が発火するのは、内部で使用している HTTP クライアント **Faraday** のタイムアウト例外です。具体的には `Faraday::TimeoutError` が発生します。

しかし当初のコードは次のようになっていました。

```ruby
# ❌ 修正前：Faraday::TimeoutError が捕捉されない
rescue OpenAI::Error => e
  render json: { error: "画像の生成に失敗しました。" }, status: :unprocessable_entity
rescue StandardError => e
  render json: { error: "画像の生成に失敗しました。" }, status: :internal_server_error
```

`Faraday::TimeoutError` は `OpenAI::Error` を継承していません。そのため `rescue OpenAI::Error` をすり抜け、`rescue StandardError` に落ちて **500 Internal Server Error** として返されていました。ユーザーには「タイムアウトなのに 500」という不自然なエラーが返る状態です。

### 修正：例外クラスを明示して正しく捕捉する

```ruby
# ✅ 修正後：タイムアウト系の例外を先に捕捉する
rescue Faraday::TimeoutError, Net::ReadTimeout, Net::OpenTimeout => e
  render json: { error: "画像の生成に時間がかかりすぎました。しばらく待ってからお試しください。" }, status: :gateway_timeout
rescue OpenAI::Error => e
  render json: { error: "画像の生成に失敗しました。" }, status: :unprocessable_entity
rescue StandardError => e
  render json: { error: "画像の生成に失敗しました。" }, status: :internal_server_error
```

`Faraday::TimeoutError` に加え、`Net::ReadTimeout` と `Net::OpenTimeout` も一緒に捕捉しています。ネットワーク層のタイムアウトはこの3クラスのいずれかで飛んでくるためです。

### 学んだこと

`rescue` は「どのクラスを継承しているか」を知らないと正しく書けません。ライブラリの内部実装がどの HTTP クライアントを使っているかまで把握して初めて、適切な例外処理が書けます。**Codex のようなコードレビュー AI は、こういった継承ツリーの見落としを指摘するのが得意です。**

---

## 5. デプロイ直後に 502 が出た罠

Puma の設定を修正して PR をマージしました。本番で確認しようとボタンを押した。

**また 502 が出た。**

「直っていない？」と焦りましたが、これは別の原因でした。

### Render のデプロイには再起動時間がある

Render は PR マージをトリガーに自動デプロイを開始します。しかし**デプロイ完了までの数分間、古いサーバーと新しいサーバーが切り替わるタイミングで一時的に 502 が出ることがあります。**

ログを見ると「新しいサーバーが起動中」の状態でリクエストを投げていました。修正の効果を確認する前に、サーバーが準備できていなかっただけです。

### 修正効果とデプロイ中の 502 を区別する方法

Render のダッシュボードで確認できる目印は次のとおりです。

```
==> Your service is live 🎉
```

このログが出てから動作確認をすれば、デプロイ中の一時 502 と修正の効果を正確に区別できます。**「直っていない」と判断する前に、まずサーバーが起動済みかをログで確認する**のが鉄則です。

---

## 6. gpt-image-1 移行と b64_json フォールバック

タイムアウト問題を解決するのと同時期に、画像生成モデル自体の移行も行いました。

### dall-e-3 は 2026-05-12 に廃止予定

OpenAI は `dall-e-3` の廃止日を公式に発表しています。個人開発アプリとはいえ、本番で動いている機能が突然壊れるのを防ぐため、`gpt-image-1` への移行を前倒しで実施しました。

### gpt-image-1 は `url` が返らないことがある

`dall-e-3` はレスポンスに常に `url` が含まれていました。しかし `gpt-image-1` は**セキュリティポリシーの違いにより、`url` が返らず `b64_json`（Base64エンコードされた画像データ）のみが返ることがあります。**

最初は `url` だけを取り出していたため、`nil` が返ってきて画像が表示されないケースが発生しました。

### b64_json 優先実装

```ruby
# OpenAI Blob URLs are temporary. Prefer base64 when available so saved
# dream images stay viewable after the upstream URL expires.
b64 = response.dig("data", 0, "b64_json")
image_url =
  if b64.present?
    "data:image/png;base64,#{b64}"
  else
    response.dig("data", 0, "url")
  end
```

`b64_json` が取れれば Data URI に変換して DB に直接保存し、取れなければ `url` を使います。`url` は OpenAI サーバー上の一時的な Blob URL で**有効期限があります**。`b64_json` を優先することで、保存済みの夢の画像が期限切れで表示できなくなる問題を根本解消しています。

**APIのレスポンス仕様はバージョンやポリシーで変わる。どちらの形式でも対応できる実装にしておくのが本番運用の基本**だと実感した変更でした。

---

## 7. まとめ：今回の対応で学んだ設計の考え方

今回の502問題は、次の3つの設計判断で解決しました。

### ① タイムアウトは「内側が短く、外側が長く」

```
OpenAI (55秒) < フロント (60秒) < Puma (90秒)
```

内側のタイムアウトが先に発火することで、外側（Rails・Puma）がエラーを正常にハンドリングできる時間を確保します。この順番が逆になると、Railsが `rescue` する前にPumaがワーカーを落としてしまいます。

### ② 例外クラスの継承ツリーを把握する

`rescue OpenAI::Error` だけでは `Faraday::TimeoutError` を捕捉できません。**ライブラリが内部でどのHTTPクライアントを使っているか**まで調べて初めて、正しい `rescue` が書けます。Codex のようなコードレビューAIはこの種の「レイヤーをまたいだ見落とし」を指摘するのが得意でした。

### ③ 「直っていない」と判断する前にログを見る

デプロイ直後の502は、修正の失敗ではなくサーバー再起動中の一時的な現象でした。`==> Your service is live 🎉` のログを確認してから動作テストをする、という手順を守るだけで無駄な焦りを防げます。

---

個人開発は「本番で壊れて初めてわかること」の連続です。ローカルで動いても本番で落ちる。APIのレスポンスが仕様通りに来ない。コードレビューAIが自分では気づかなかった穴を見つける。

こうした経験を積み重ねることが、実務で通用するエンジニアへの最短経路だと感じています。

