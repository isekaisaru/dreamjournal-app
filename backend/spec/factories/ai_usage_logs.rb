FactoryBot.define do
  factory :ai_usage_log do
    association :user
    feature { 'dream_analysis' }
  end
end
