# frozen_string_literal: true

# パスワードリセットトークンを平文カラムからSHA256 digest保存へ移行する。
# 設計: docs/auth-hardening-spec.md フォローアップ節（#414 user_sessions /
# #415 email_verification_token と同じパターン）。
#
# 【burn-inが不要な理由】
# refresh tokenと違い、リセットトークンは発行から60分（User#password_reset_valid?）
# で失効する短命トークン。このmigrationデプロイ時点で、デプロイ前に発行された
# トークンは必ず期限切れになっているため、レガシー互換パスは不要で
# 平文カラムをそのまま削除してよい。
class DigestPasswordResetToken < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :reset_password_token_digest, :string
    add_index  :users, :reset_password_token_digest, unique: true
    remove_column :users, :reset_password_token, :string
  end
end
