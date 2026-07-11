# frozen_string_literal: true

# users.refresh_token（平文・レガシー）カラムを削除する。
# 設計: docs/auth-hardening-spec.md（PR1 #414のフォローアップ）
#
# 【前提】
# #414（user_sessions導入）から burn-in 期間を経て、本番で
# `SELECT COUNT(*) FROM users WHERE refresh_token IS NOT NULL;` を確認済み。
# 未移行（デプロイ前からログインしたまま一度もアプリを開いていない）の
# ユーザーが残っていても、このmigrationと同時にレガシーフォールバックの
# コード（AuthService#consume_legacy_refresh_token 等）を削除するため、
# 次回アクセス時は「セッションが見つからない」401として扱われ、
# 通常の再ログインを促すだけで済む（クラッシュしない）。
class RemoveLegacyRefreshTokenFromUsers < ActiveRecord::Migration[7.1]
  def change
    remove_column :users, :refresh_token, :string
  end
end
