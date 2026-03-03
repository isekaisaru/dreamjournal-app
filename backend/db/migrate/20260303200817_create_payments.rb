class CreatePayments < ActiveRecord::Migration[7.1]
  def change
    create_table :payments do |t|
      t.references :user, null: false, foreign_key: true
      t.string :stripe_session_id, null: false
      t.integer :amount, null: false
      t.string :status, null: false, default: "completed"

      t.timestamps
    end

    add_index :payments, :stripe_session_id, unique: true
  end
end
