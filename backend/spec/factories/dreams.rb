FactoryBot.define do
  factory :dream do
    association :user
    sequence(:title) { |n| "夢のタイトル#{n}" }
    sequence(:content) { |n| "これは夢の内容です。#{n}番目の夢について詳しく記録しています。この夢では様々な出来事が起こりました。" }

    trait :with_emotions do
      after(:create) do |dream|
        emotions = create_list(:emotion, 2)
        dream.emotions = emotions
      end
    end

    trait :long_content do
      content { "これは非常に長い夢の内容です。" + "夢の中では様々な出来事が起こりました。" * 10 }
    end

    trait :short_title do
      title { "短い夢" }
    end
  end
end