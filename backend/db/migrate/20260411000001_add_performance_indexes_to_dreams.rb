class AddPerformanceIndexesToDreams < ActiveRecord::Migration[7.1]
  def change
    # (user_id, created_at) 複合インデックス
    # current_user.dreams.order(created_at: :desc) の主要クエリを高速化する。
    # user_id 単体インデックスより、ソートまで含めてカバーできる。
    add_index :dreams, [:user_id, :created_at],
              name: "index_dreams_on_user_id_and_created_at"

    # 画像生成済みの夢に対する部分インデックス
    # check_monthly_image_limit での
    # WHERE generated_image_url IS NOT NULL AND updated_at >= ? を高速化する。
    # generated_image_url が NULL の多数の行をインデックス対象から除外できる。
    add_index :dreams, [:user_id, :updated_at],
              where: "generated_image_url IS NOT NULL",
              name: "index_dreams_on_user_id_and_updated_at_with_image"

    # analysis_status インデックス
    # ステータスポーリング（GET /dreams/:id/analysis）の高速化。
    add_index :dreams, :analysis_status,
              name: "index_dreams_on_analysis_status"
  end
end
