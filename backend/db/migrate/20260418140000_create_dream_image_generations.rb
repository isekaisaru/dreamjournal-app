class CreateDreamImageGenerations < ActiveRecord::Migration[7.2]
  def up
    create_table :dream_image_generations do |t|
      t.references :dream, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.datetime :generated_at, null: false
      t.timestamps
    end

    add_index :dream_image_generations, [:user_id, :generated_at],
              name: "index_dream_image_generations_on_user_id_and_generated_at"
    add_index :dream_image_generations, [:dream_id, :generated_at],
              name: "index_dream_image_generations_on_dream_id_and_generated_at"

    execute <<~SQL
      INSERT INTO dream_image_generations (dream_id, user_id, generated_at, created_at, updated_at)
      SELECT id, user_id, COALESCE(image_generated_at, updated_at), COALESCE(image_generated_at, updated_at), COALESCE(image_generated_at, updated_at)
      FROM dreams
      WHERE generated_image_url IS NOT NULL
    SQL
  end

  def down
    drop_table :dream_image_generations
  end
end
