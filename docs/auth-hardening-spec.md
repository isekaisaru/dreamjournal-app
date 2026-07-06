# 認証強化 設計仕様（2026-07）

7月計画「守りのMust」の一環。世界観MVPに進む前に、ユーザーが増えたとき困らない
セッション管理とメール有効化を**小さいPRの連続**で固める。

## 現状の課題（2026-07時点の実装調査）

現行は Rails 標準セッションではなく、`access_token`（JWT・短命）＋`refresh_token` を
HttpOnly Cookie に入れる独自方式（`AuthService` / `ApplicationController#set_token_cookies`）。
方式自体は Next.js + Rails API 構成として妥当だが、refresh token の管理が弱い:

| # | 課題 | リスク |
|---|------|--------|
| 1 | `users.refresh_token` 1カラムのみ | 端末Aでログインすると端末Bのセッションが即死（多端末不可）。端末別ログアウト不可 |
| 2 | refresh token がDBに**平文**保存 | DBが読まれた場合、全ユーザーのセッションを乗っ取れる |
| 3 | 失効時刻・端末情報・最終利用時刻なし | 無期限に有効。不審セッションの調査・失効ができない |
| 4 | メール有効化なし | 他人のメールアドレスで登録できる。到達しないメールへ課金領収書等を送るリスク |
| 5 | パスワードリセットトークンが平文カラム | 課題2と同種（既存機能。本仕様のフォローアップで対応） |

## 方針

- **総入れ替えはしない**。JWT access token / Cookie 運用 / フロントの `AuthContext` 契約
  （エンドポイント・Cookie名・レスポンス形）は維持する。
- Rails 8 の公式 authentication generator が採用する「User と別に Session モデルを持つ」
  構成に寄せる。Devise への全面移行は trial conversion フローと衝突するため見送り。
- 既存ログイン中ユーザーを**デプロイで強制ログアウトさせない**（レガシー互換パスを一時併存）。

## PR1: `user_sessions` テーブル + refresh token digest 化

### スキーマ

```ruby
create_table :user_sessions do |t|
  t.references :user, null: false, foreign_key: true
  t.string   :refresh_token_digest, null: false  # SHA256(token) を保存。平文は保存しない
  t.datetime :expires_at, null: false            # デフォルト30日（REFRESH_TOKEN_EXPIRATION_DAYS）
  t.datetime :revoked_at                          # 端末別ログアウト・強制失効
  t.string   :user_agent
  t.string   :ip_address
  t.datetime :last_used_at
  t.timestamps
end
add_index :user_sessions, :refresh_token_digest, unique: true
# 他テーブル同様に RLS 有効化（Default Deny）
```

digest は bcrypt ではなく **SHA256**。refresh token は128bit以上のランダム値なので
レインボーテーブル耐性は entropy 側で担保され、インデックスによる等値検索が必要なため。

### フロー変更

- **login / register / trial_login**: `users.refresh_token` 更新をやめ、`user_sessions` に
  新規セッションを作成（多端末対応）。1ユーザーの有効セッションは最大5件。超過時は古い順に失効。
- **refresh**: digest 一致 & 未失効 & 未期限切れのセッションを検索し、トークンをローテーション
  （digest を新値に更新、`last_used_at` 更新、期限をスライド延長）。
- **convert_trial**: 全セッション失効 + 新セッション発行（権限変化時の全ローテーション）。
- **logout**: 該当セッションのみ `revoked_at` を打つ（他端末は生き続ける）。
- **レガシー互換**: セッションが見つからない場合のみ旧 `users.refresh_token`（平文）と照合し、
  一致したらその場で `user_sessions` へ移行して旧カラムを `nil` 化。
  デプロイ後もログイン中ユーザーは次回 refresh 時に透過的に新方式へ移る。

### 後続クリーンアップ（別PR・burn-in後）

- `users.refresh_token` カラムの削除（レガシー互換パスの削除と同時）
- 期限切れ・失効セッションの定期削除（rake or migration）

## PR2: メールアドレス有効化（account activation）

### スキーマ

```ruby
add_column :users, :email_verified_at, :datetime
add_column :users, :email_verification_token_digest, :string
add_column :users, :email_verification_sent_at, :datetime
add_index  :users, :email_verification_token_digest, unique: true
# 既存ユーザーは grandfather（email_verified_at = NOW() でバックフィル）
```

### フロー

- **register**: 未認証状態で作成し、検証メールを送信（`deliver_later`・失敗しても登録は成功）。
- **trial_login**: メール検証しない（トライアルは実メール不要のまま）。
- **convert_trial**: 新メールは未認証扱いにして検証メールを送信。
- **POST /auth/verify_email**（token）: digest 照合→`email_verified_at` を打つ。token は24時間有効。
- **POST /auth/resend_verification**（認証必須）: 前回送信から5分以上で再送可。
- **段階制御**: 未認証でも閲覧・夢作成は可。**課金（POST /checkout）のみ検証必須**
  （既存ユーザーは grandfather 済みなので影響なし）。
- **フロント**: `/verify-email` ページ（公開・robots除外）。`user_json` に `email_verified` を追加し
  バナー表示等はフロント側の後続対応とする。

### メール配信基盤

Action Mailer は導入済み（パスワードリセットで使用中）。本番の配信サービスは
**Resend**（Rails 公式手順あり・無料枠100通/日）を第一候補、Postmark / Amazon SES を代替とする。
本番送信には環境変数（SMTP認証情報・From アドレス）の設定が必要 → **ユーザー作業**。
未設定でも登録自体は失敗しない設計にする（メール送信は best-effort + ログ）。

## フォローアップ（本仕様のスコープ外・優先度順）

1. パスワードリセットトークンの digest 化（PR1と同じパターン）
2. `users.refresh_token` カラム削除
3. メール変更時の再検証フロー
4. セッション一覧・端末別ログアウトUI（EM/テックリード志向のポートフォリオ素材として良い）
