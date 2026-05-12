class CreateAiUsageLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :ai_usage_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.string :feature, null: false
      t.datetime :created_at, null: false
    end

    # 「ユーザー × 機能 × 日付」の3軸で高速集計するためのインデックス
    add_index :ai_usage_logs, [:user_id, :feature, :created_at],
              name: "index_ai_usage_logs_on_user_feature_created_at"
  end
end
