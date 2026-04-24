class AddMonthlyAnalysisUsageToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :monthly_analysis_count, :integer, null: false, default: 0
    add_column :users, :monthly_analysis_count_reset_at, :datetime
  end
end
