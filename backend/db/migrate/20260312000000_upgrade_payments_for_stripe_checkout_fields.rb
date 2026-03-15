class UpgradePaymentsForStripeCheckoutFields < ActiveRecord::Migration[7.1]
  def up
    rename_column :payments, :stripe_session_id, :stripe_checkout_session_id
    rename_index :payments,
                 'index_payments_on_stripe_session_id',
                 'index_payments_on_stripe_checkout_session_id'

    add_column :payments, :stripe_payment_intent_id, :string
    add_column :payments, :currency, :string, limit: 3

    # 既存の payments は現行 Checkout 実装（CheckoutController#create）で作られたレコードのみを想定。
    # 現時点では line_items.price_data.currency が jpy 固定のため、既存行は一括で jpy を backfill する。
    execute <<~SQL
      UPDATE payments
      SET currency = 'jpy'
      WHERE currency IS NULL
    SQL

    change_column_null :payments, :currency, false
    change_column_default :payments, :status, from: "completed", to: nil

    add_index :payments, :stripe_payment_intent_id, unique: true
    add_index :payments, [:user_id, :created_at]
  end

  def down
    remove_index :payments, [:user_id, :created_at]
    remove_index :payments, :stripe_payment_intent_id

    change_column_default :payments, :status, from: nil, to: "completed"
    change_column_null :payments, :currency, true

    remove_column :payments, :currency
    remove_column :payments, :stripe_payment_intent_id

    rename_index :payments,
                 'index_payments_on_stripe_checkout_session_id',
                 'index_payments_on_stripe_session_id'
    rename_column :payments, :stripe_checkout_session_id, :stripe_session_id
  end
end
