class AddContentToDreams < ActiveRecord::Migration[7.0]
  def change
    add_column :dreams, :content, :text
  end
end
