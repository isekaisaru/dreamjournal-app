FactoryBot.define do
  factory :dream_profile do
    association :user
    sequence(:name) { |n| "プロフィール#{n}" }
    avatar_emoji { "🌙" }
    color        { "#6366f1" }
    relationship { "other" }
    active       { true }
    position     { 0 }

    trait :self_profile do
      name         { "自分" }
      avatar_emoji { "😴" }
      relationship { "self" }
    end

    trait :archived do
      active { false }
    end
  end
end
