class AddGeneratedImageUrlToDreams < ActiveRecord::Migration[7.1]
  def change
    add_column :dreams, :generated_image_url, :text
  end
end
