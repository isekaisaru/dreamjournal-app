require 'rails_helper'

RSpec.describe User, type: :model do
  describe '#premium_active_subscription?' do
    it 'returns true when the user has an active subscription' do
      user = create(:user)
      create(:subscription, user: user, status: 'active')

      expect(user.premium_active_subscription?).to be true
    end

    it 'returns true when the user has a past_due subscription' do
      user = create(:user)
      create(:subscription, user: user, status: 'past_due')

      expect(user.premium_active_subscription?).to be true
    end

    it 'returns false when the user only has canceled subscriptions' do
      user = create(:user)
      create(:subscription, user: user, status: 'canceled')

      expect(user.premium_active_subscription?).to be false
    end
  end
end
