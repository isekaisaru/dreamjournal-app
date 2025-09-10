class AddAnalysisFieldsToDreams < ActiveRecord::Migration[7.1]
  def change
    add_column :dreams, :analysis_status, :string
    add_column :dreams, :analysis_json, :jsonb
    add_column :dreams, :analyzed_at, :datetime
  end
end
