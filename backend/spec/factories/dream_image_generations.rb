FactoryBot.define do
  factory :dream_image_generation do
    association :dream
    user { dream.user }
    generated_at { Time.current }
  end
end
