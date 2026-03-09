class PaymentsObservability
  class << self
    def log(event:, level: :info, **context)
      message = +"[Payments] event=#{event}"
      context.compact.each do |key, value|
        message << " #{key}=#{value}"
      end
      Rails.logger.public_send(level, message)
    end

    def increment(counter, **tags)
      payload = { counter: counter, value: 1, tags: tags.compact }
      ActiveSupport::Notifications.instrument('payments.kpi.increment', payload)

      message = +"[PaymentsKPI] counter=#{counter} value=1"
      payload[:tags].each do |key, value|
        message << " #{key}=#{value}"
      end
      Rails.logger.info(message)
    end
  end
end
