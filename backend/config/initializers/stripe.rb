require Rails.root.join('lib/stripe_environment_guard')

stripe_mode = StripeEnvironmentGuard.resolve_mode(
  configured_mode: ENV['STRIPE_MODE'],
  rails_env: Rails.env
)

StripeEnvironmentGuard.validate_key_modes!(
  mode: stripe_mode,
  secret_key: ENV['STRIPE_SECRET_KEY'],
  publishable_key: ENV['STRIPE_PUBLISHABLE_KEY']
)

Rails.configuration.stripe = {
  publishable_key: ENV['STRIPE_PUBLISHABLE_KEY'],
  secret_key:      ENV['STRIPE_SECRET_KEY'],
  mode:            stripe_mode
}

Stripe.api_key = Rails.configuration.stripe[:secret_key]
