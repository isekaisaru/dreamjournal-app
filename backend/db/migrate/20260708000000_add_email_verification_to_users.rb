# frozen_string_literal: true

# メールアドレス有効化（account activation）の基盤。
# 設計: docs/auth-hardening-spec.md（PR2）
#
# 既存ユーザーは全員 grandfather（検証済み扱い）にする。
# 検証を必須にするのはこの機能のデプロイ後に登録する新規ユーザーのみ。
class AddEmailVerificationToUsers < ActiveRecord::Migration[7.1]
  def up
    add_column :users, :email_verified_at, :datetime
    add_column :users, :email_verification_token_digest, :string
    add_column :users, :email_verification_sent_at, :datetime
    add_index :users, :email_verification_token_digest, unique: true

    # 既存ユーザーをすべて検証済みにバックフィル。
    # ここで grandfather しないと、既存ユーザーが突然
    # 「メール確認が必要」状態になり課金等がブロックされてしまう。
    execute "UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL"
  end

  def down
    remove_index :users, :email_verification_token_digest
    remove_column :users, :email_verification_sent_at
    remove_column :users, :email_verification_token_digest
    remove_column :users, :email_verified_at
  end
end
