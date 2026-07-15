# frozen_string_literal: true

# 本番DBの dream_profile_id 未設定データを是正する一回限りのバックフィルmigration。
#
# 【背景】
# dream_profiles 機能導入前に作成された既存の夢は dream_profile_id が NULL のまま。
# 通常は rake dream_profiles:ensure_self_profiles / backfill_dream_profile_id で
# 是正するが、Render 無料プランでは Shell / one-off jobs が使えず本番で rake を
# 直接実行できないため、デプロイ時に自動実行される migration として同等の処理を行う。
#
# 【ロジック】
# 既存rake task（lib/tasks/dream_profiles.rake）と同じ2ステップを、この順序で実行する。
# 1. ensure_self_profiles 相当: 「自分」プロフィールを持たないユーザーにだけ作成
# 2. backfill_dream_profile_id 相当: dream_profile_id が NULL の夢だけを、
#    同一ユーザーの「自分」プロフィールに紐付ける
#
# 【冪等性】
# - Step 1 は NOT EXISTS で既存の self プロフィールを除外するため再実行しても増えない。
#   万が一の二重INSERTも idx_dream_profiles_unique_self（relationship='self' の user_id
#   ユニーク制約）がDBレベルで防ぐ。
# - Step 2 は dream_profile_id IS NULL の夢だけを対象にするため、既に割当済みの夢には
#   触れない。
#
# 【安全性】
# - migrationはデフォルトで単一トランザクションに包まれるため、Step 2 で失敗しても
#   Step 1 の INSERT ごとロールバックされ、中途半端な状態は残らない。
# - NOT NULL化などスキーマ変更は行わない（別PRで対応）。
# - Stripe / 認証 / UI / OpenAI には一切触れない。
class BackfillDreamProfileIdForExistingDreams < ActiveRecord::Migration[7.1]
  def up
    # Step 1: ensure_self_profiles 相当
    created = execute(<<~SQL)
      INSERT INTO dream_profiles
        (user_id, name, avatar_emoji, color, relationship, active, position, created_at, updated_at)
      SELECT u.id, '自分', '😴', '#6366f1', 'self', true, 0, NOW(), NOW()
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM dream_profiles dp
        WHERE dp.user_id = u.id AND dp.relationship = 'self'
      )
    SQL

    # Step 2: backfill_dream_profile_id 相当
    # user_id が一致する self プロフィールにだけ紐付ける
    backfilled = execute(<<~SQL)
      UPDATE dreams
      SET dream_profile_id = dp.id
      FROM dream_profiles dp
      WHERE dp.user_id = dreams.user_id
        AND dp.relationship = 'self'
        AND dreams.dream_profile_id IS NULL
    SQL

    remaining = execute("SELECT COUNT(*) AS count FROM dreams WHERE dream_profile_id IS NULL")
                  .first["count"].to_i

    message = "[BackfillDreamProfileIdForExistingDreams] " \
              "self profile作成 #{created.cmd_tuples} 件 / " \
              "dream紐付け #{backfilled.cmd_tuples} 件 / " \
              "残NULL #{remaining} 件"
    Rails.logger.info(message)
    say(message)
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
