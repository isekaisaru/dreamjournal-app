FactoryBot.define do
  factory :subscription do
    association :user
    sequence(:stripe_subscription_id) { |n| "sub_test_#{n}" }
    sequence(:stripe_customer_id) { |n| "cus_test_#{n}" }
    status { "active" }
    current_period_end { 1.month.from_now }
  end
end
