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

    # 本番の登録フロー（users_controller / trial_users_controller）は
    # サインアップ時に必ず self プロフィールを作成する。dream_profile_id が
    # NOT NULL化された後は、その前提を再現しないと初回の夢作成specが
    # 実態と異なる失敗をするため、明示的にオプトインできるようにする。
    trait :with_self_profile do
      after(:create) do |user|
        create(:dream_profile, :self_profile, user: user)
      end
    end
  end
end