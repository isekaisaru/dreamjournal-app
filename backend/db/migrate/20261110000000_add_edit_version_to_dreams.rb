# Issue #561: 利用者の編集（title / content / dream_profile_id / emotion_ids）の版番号。
#
# Rails標準の楽観ロック列名 lock_version は使わない。lock_version にすると
# 画像生成・AI分析ジョブ・削除を含む全書き込みが版を比較・加算し、
# 編集していない利用者に偽の競合を出したり、OpenAI課金後の保存を失敗させたりするため。
#
# 定数デフォルト付きの列追加は PostgreSQL 11 以降ではテーブルを書き換えず、既存行も 0 で揃う。
# ACCESS EXCLUSIVE ロックは一瞬だが、長いトランザクションの後ろで待つと後続の読み書きが
# 詰まるため lock_timeout で失敗させ、再実行で対応する。
class AddEditVersionToDreams < ActiveRecord::Migration[7.2]
  def up
    execute "SET LOCAL lock_timeout = '3s'"
    add_column :dreams, :edit_version, :integer, null: false, default: 0
  end

  def down
    remove_column :dreams, :edit_version
  end
end
