FactoryBot.define do
  factory :user do
    sequence(:username) { |n| "testuser#{n}" }
    sequence(:email) { |n| "testuser#{n}@example.com" }
    password { "password123" }
    password_confirmation { "password123" }

    trait :with_dreams do
      after(:create) do |user|
        create_list(:dream, 3, user: user)
      end
    end
  end
end