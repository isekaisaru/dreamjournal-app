module StripeEnvironmentGuard
  class ConfigurationError < StandardError; end

  MODES = %w[test live].freeze
  SECRET_KEY_PREFIXES = {
    'test' => %w[sk_test_ rk_test_],
    'live' => %w[sk_live_ rk_live_]
  }.freeze
  PUBLISHABLE_KEY_PREFIXES = {
    'test' => 'pk_test_',
    'live' => 'pk_live_'
  }.freeze

  module_function

  def resolve_mode(configured_mode:, rails_env:)
    mode = configured_mode.to_s.strip
    mode = rails_env.to_s == 'production' ? 'live' : 'test' if mode.empty?
    raise ConfigurationError, 'STRIPE_MODE must be test or live' unless MODES.include?(mode)

    mode
  end

  def validate_key_modes!(mode:, secret_key:, publishable_key:)
    validate_secret_key!(mode, secret_key) if present?(secret_key)
    validate_publishable_key!(mode, publishable_key) if present?(publishable_key)
  end

  def validate_price!(price:, mode:)
    validate_livemode!(resource: price, mode: mode, resource_name: 'Stripe Price')
  end

  def validate_event!(event:, mode:)
    validate_livemode!(resource: event, mode: mode, resource_name: 'Stripe Event')
  end

  def validate_secret_key!(mode, secret_key)
    prefixes = SECRET_KEY_PREFIXES.fetch(mode)
    return if prefixes.any? { |prefix| secret_key.start_with?(prefix) }

    raise ConfigurationError, 'STRIPE_SECRET_KEY does not match STRIPE_MODE'
  end
  private_class_method :validate_secret_key!

  def validate_publishable_key!(mode, publishable_key)
    return if publishable_key.start_with?(PUBLISHABLE_KEY_PREFIXES.fetch(mode))

    raise ConfigurationError, 'STRIPE_PUBLISHABLE_KEY does not match STRIPE_MODE'
  end
  private_class_method :validate_publishable_key!

  def validate_livemode!(resource:, mode:, resource_name:)
    return if mode.nil?

    unless resource.respond_to?(:livemode)
      raise ConfigurationError, "#{resource_name} does not expose livemode"
    end

    expected_livemode = mode == 'live'
    return if resource.livemode == expected_livemode

    raise ConfigurationError, "#{resource_name} livemode does not match STRIPE_MODE"
  end
  private_class_method :validate_livemode!

  def present?(value)
    !value.to_s.strip.empty?
  end
  private_class_method :present?
end
