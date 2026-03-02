class CreateProcessedWebhookEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :processed_webhook_events do |t|
      t.string :stripe_event_id, null: false
      t.datetime :processed_at, null: false

      t.timestamps
    end

    add_index :processed_webhook_events, :stripe_event_id, unique: true
  end
end
