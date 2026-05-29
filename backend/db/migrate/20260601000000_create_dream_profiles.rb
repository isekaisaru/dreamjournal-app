# frozen_string_literal: true

class CreateDreamProfiles < ActiveRecord::Migration[7.1]
  def change
    create_table :dream_profiles do |t|
      t.references :user, null: false, foreign_key: true
      t.string  :name,          null: false
      t.string  :avatar_emoji,  null: false, default: "😴"
      t.string  :color,         null: false, default: "#6366f1"
      t.string  :relationship,  null: false, default: "self"
      t.boolean :active,        null: false, default: true
      t.integer :position,      null: false, default: 0
      t.timestamps
    end

    # 表示順クエリ用（user_id + position で並び替え）
    add_index :dream_profiles, [:user_id, :position],
              name: "idx_dream_profiles_user_position"

    # active プロフィール絞り込み用部分インデックス
    add_index :dream_profiles, :user_id,
              where: "active = true",
              name: "idx_dream_profiles_active"

    # self プロフィールは user_id スコープで1件のみ許可
    add_index :dream_profiles, :user_id,
              unique: true,
              where: "relationship = 'self'",
              name: "idx_dream_profiles_unique_self"
  end
end
