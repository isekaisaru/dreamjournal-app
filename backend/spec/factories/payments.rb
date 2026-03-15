FactoryBot.define do
  factory :payment do
    association :user
    sequence(:stripe_checkout_session_id) { |n| "cs_test_#{n}" }
    sequence(:stripe_payment_intent_id) { |n| "pi_test_#{n}" }
    amount { 500 }
    currency { "jpy" }
    status { "paid" }
  end
end
