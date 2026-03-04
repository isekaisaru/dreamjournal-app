FactoryBot.define do
  factory :payment do
    association :user
    sequence(:stripe_session_id) { |n| "cs_test_#{n}" }
    amount { 500 }
    status { "completed" }
  end
end
