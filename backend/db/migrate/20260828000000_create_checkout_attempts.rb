class CreateCheckoutAttempts < ActiveRecord::Migration[7.2]
  ACTIVE_STATUSES = %w[pending open uncertain].freeze
  ALL_STATUSES = (ACTIVE_STATUSES + %w[completed expired failed]).freeze

  def change
    create_table :checkout_attempts do |t|
      t.references :user, null: false, foreign_key: true
      t.string :plan, null: false
      t.string :price_reference, null: false
      t.string :idempotency_key, null: false
      t.string :customer_idempotency_key, null: false
      t.string :stripe_customer_id
      t.string :stripe_checkout_session_id
      t.string :status, null: false, default: 'pending'
      t.datetime :expires_at

      t.timestamps
    end

    add_index :checkout_attempts, :idempotency_key, unique: true
    add_index :checkout_attempts, :customer_idempotency_key
    add_index :checkout_attempts, :stripe_checkout_session_id, unique: true
    add_index :checkout_attempts,
      [:user_id, :plan],
      unique: true,
      where: "status IN ('pending', 'open', 'uncertain')",
      name: 'index_checkout_attempts_on_active_user_and_plan'
    add_check_constraint :checkout_attempts,
      "status IN (#{ALL_STATUSES.map { |status| connection.quote(status) }.join(', ')})",
      name: 'checkout_attempts_status_check'
  end
end
