# frozen_string_literal: true

# refresh token を users.refresh_token（平文・1本のみ）から
# user_sessions テーブル（digest保存・多端末対応・失効管理つき）へ移行する基盤。
# 設計: docs/auth-hardening-spec.md（PR1）
#
# users.refresh_token カラムはレガシー互換（デプロイ後もログイン中ユーザーを
# 強制ログアウトさせないための移行パス）に使うため、このPRでは削除しない。
class CreateUserSessions < ActiveRecord::Migration[7.1]
  def up
    create_table :user_sessions do |t|
      t.references :user, null: false, foreign_key: true
      # SHA256(token) を保存。平文トークンはDBに置かない
      t.string   :refresh_token_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :revoked_at
      t.string   :user_agent
      t.string   :ip_address
      t.datetime :last_used_at
      t.timestamps
    end
    add_index :user_sessions, :refresh_token_digest, unique: true

    # 他テーブル（dream_profiles 等）と同じ方針:
    # Rails API のみが postgres ロール（BYPASSRLS）で接続するため、
    # RLS有効化＋ポリシーなし＝PostgREST からの直接アクセスを全遮断（Default Deny）
    execute "ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;"
  end

  def down
    drop_table :user_sessions
  end
end
