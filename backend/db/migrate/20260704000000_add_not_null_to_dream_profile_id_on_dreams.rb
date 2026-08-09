# frozen_string_literal: true

# dreams.dream_profile_id を NOT NULL 化する。
#
# 【前提】
# PR #412（20260703000000_backfill_dream_profile_id_for_existing_dreams）で
# 本番の未紐付けデータは是正済み。本番Supabaseで以下を確認済み:
#   - null_dreams = 0
#   - invalid_profile_links = 0
#
# 【このmigrationでやること】
# dream_profile_id の NOT NULL化のみ。backfill処理はここには含めない
# （それは #412 の責務であり、既に完了している）。
#
# 【安全策】
# NOT NULL化の直前に NULL残存件数を確認し、1件でも残っていれば
# ActiveRecord::MigrationError で即座に中断する。デプロイのタイミングと
# 本番確認のタイミングがズレて、想定外にNULLが復活していた場合でも
# 制約違反エラーで落ちる代わりに、原因が分かるメッセージで安全に止める。
class AddNotNullToDreamProfileIdOnDreams < ActiveRecord::Migration[7.1]
  def up
    remaining = execute("SELECT COUNT(*) AS count FROM dreams WHERE dream_profile_id IS NULL")
                  .first["count"].to_i

    if remaining.positive?
      raise ActiveRecord::MigrationError,
            "dream_profile_id が NULL の夢が #{remaining} 件残っているため NOT NULL化を中断しました。" \
            "先に backfill（dream_profiles:backfill_dream_profile_id 相当）を完了させてください。"
    end

    change_column_null :dreams, :dream_profile_id, false
  end

  def down
    change_column_null :dreams, :dream_profile_id, true
  end
end
