class AddProfileFieldsToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :age_group, :string, default: "child", null: false
    add_column :users, :analysis_tone, :string, default: "auto", null: false
  end
end
