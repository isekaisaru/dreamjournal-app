FactoryBot.define do
  factory :user_session do
    association :user
    refresh_token_digest { UserSession.digest(SecureRandom.urlsafe_base64(64)) }
    expires_at { 30.days.from_now }
    last_used_at { Time.current }

    trait :revoked do
      revoked_at { 1.hour.ago }
    end

    trait :expired do
      expires_at { 1.hour.ago }
    end
  end
end
