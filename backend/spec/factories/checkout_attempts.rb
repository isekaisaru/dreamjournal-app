FactoryBot.define do
  factory :checkout_attempt do
    association :user
    plan { 'premium' }
    price_reference { 'price_premium_test' }
    idempotency_key { SecureRandom.uuid }
    customer_idempotency_key { SecureRandom.uuid }
    status { 'pending' }
  end
end
