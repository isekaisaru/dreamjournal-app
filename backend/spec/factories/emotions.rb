FactoryBot.define do
  factory :emotion do
    sequence(:name) { |n| "感情#{n}" }

    trait :happiness do
      name { "幸せ" }
    end

    trait :sadness do
      name { "悲しみ" }
    end

    trait :fear do
      name { "恐怖" }
    end

    trait :anger do
      name { "怒り" }
    end
  end
end