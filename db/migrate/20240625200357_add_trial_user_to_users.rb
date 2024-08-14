class AddTrialUserToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :trial_user, :boolean
  end
end
