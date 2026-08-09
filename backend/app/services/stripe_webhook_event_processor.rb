require 'digest'

class StripeWebhookEventProcessor
  def self.call(stripe_event_id, &block)
    new(stripe_event_id).call(&block)
  end

  def initialize(stripe_event_id)
    @stripe_event_id = stripe_event_id.to_s
  end

  def call
    result = nil

    ApplicationRecord.transaction(requires_new: true) do
      acquire_event_lock!

      if ProcessedWebhookEvent.exists?(stripe_event_id: @stripe_event_id)
        result = :duplicate
      else
        yield
        ProcessedWebhookEvent.create!(
          stripe_event_id: @stripe_event_id,
          processed_at: Time.current
        )
        result = :processed
      end
    end

    result
  end

  private

  def acquire_event_lock!
    raise ArgumentError, 'stripe_event_id is required' if @stripe_event_id.blank?

    lock_key = Digest::SHA256.digest(@stripe_event_id).unpack1('q>')
    ApplicationRecord.connection.execute(
      "SELECT pg_advisory_xact_lock(#{lock_key})"
    )
  end
end
