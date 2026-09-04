class AddStripeCustomerIdempotencyKeyToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :stripe_customer_idempotency_key, :string
    add_index :users, :stripe_customer_idempotency_key, unique: true
  end
end
