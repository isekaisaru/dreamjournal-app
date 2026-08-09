require 'rails_helper'

RSpec.describe StripeWebhookEventProcessor, type: :model do
  self.use_transactional_tests = false

  let(:stripe_event_id) { "evt_concurrent_#{SecureRandom.hex(8)}" }

  after do
    ProcessedWebhookEvent.where(stripe_event_id: stripe_event_id).delete_all
  end

  it '同じstripe_event_idを並行処理しても業務処理を1回だけ実行する' do
    executions = 0
    executions_mutex = Mutex.new
    start_gate = Queue.new

    threads = 2.times.map do
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          start_gate.pop
          described_class.call(stripe_event_id) do
            executions_mutex.synchronize { executions += 1 }
            sleep 0.1
          end
        end
      end
    end

    2.times { start_gate << true }
    results = threads.map(&:value)

    expect(results).to contain_exactly(:processed, :duplicate)
    expect(executions).to eq(1)
    expect(ProcessedWebhookEvent.where(stripe_event_id: stripe_event_id).count).to eq(1)
  end
end
