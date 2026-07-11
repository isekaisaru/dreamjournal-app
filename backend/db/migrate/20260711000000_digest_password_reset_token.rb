# frozen_string_literal: true

# パスワードリセットトークンを平文カラムからSHA256 digest保存へ移行する。
# 設計: docs/auth-hardening-spec.md フォローアップ節（#414 user_sessions /
# #415 email_verification_token と同じパターン）。
#
# 【Codexレビュー指摘（P2）への対応】
# 当初案は「リセットトークンは60分で失効する短命トークンだからバックフィル
# 不要」としていたが、これは誤り。migrationはデプロイと同時に実行されるため、
# デプロイ直前（60分以内）に発行された有効なトークンがまだ存在しうる。
# 平文カラムをバックフィルせずに削除すると、それらの有効なリンクが
# 突然無効になってしまう。
#
# そのため、平文カラムを削除する前に、既存の値をSHA256 digestへ
# バックフィルする。バックフィル自体は一度きりの処理で済む（リセット
# トークンは短命なので、refresh_tokenのような恒久的なレガシー互換
# コードは不要）。
#
# 【Userモデルに依存しない理由】
# 将来Userモデルのバリデーション・コールバックが変わっても、この
# migrationを単体で安全に再実行できるようにするため、ActiveRecordの
# モデル経由ではなく生SQL（execute）とRuby標準ライブラリのDigestだけで
# バックフィルを行う。
class DigestPasswordResetToken < ActiveRecord::Migration[7.1]
  def up
    add_column :users, :reset_password_token_digest, :string

    backfill_digests

    add_index  :users, :reset_password_token_digest, unique: true
    remove_column :users, :reset_password_token, :string
  end

  def down
    add_column :users, :reset_password_token, :string
    remove_column :users, :reset_password_token_digest
  end

  private

  def backfill_digests
    rows = execute("SELECT id, reset_password_token FROM users WHERE reset_password_token IS NOT NULL")
    rows.each do |row|
      digest = Digest::SHA256.hexdigest(row["reset_password_token"])
      execute(
        "UPDATE users SET reset_password_token_digest = #{quote(digest)} WHERE id = #{row['id'].to_i}"
      )
    end
  end
end
