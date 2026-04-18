class AddImageGeneratedAtToDreams < ActiveRecord::Migration[7.2]
  def change
    add_column :dreams, :image_generated_at, :datetime

    # 既存レコードのバックフィル: 画像がある夢は updated_at を初期値とする
    reversible do |dir|
      dir.up do
        execute <<~SQL
          UPDATE dreams
          SET image_generated_at = updated_at
          WHERE generated_image_url IS NOT NULL
        SQL
      end
    end

    # quota クエリ用インデックス (user_id, image_generated_at) WHERE image_generated_at IS NOT NULL
    add_index :dreams, [:user_id, :image_generated_at],
              where: "image_generated_at IS NOT NULL",
              name: "index_dreams_on_user_id_and_image_generated_at"
  end
end
