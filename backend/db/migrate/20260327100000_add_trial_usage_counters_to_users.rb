class AddTrialUsageCountersToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :trial_analysis_count, :integer, default: 0, null: false
    add_column :users, :trial_audio_count, :integer, default: 0, null: false
  end
end
