require 'rails_helper'

RSpec.describe User, type: :model do
  describe '#reset_monthly_analysis_count_if_needed!' do
    it 'resets the count when the tracked month is stale' do
      user = create(
        :user,
        monthly_analysis_count: 7,
        monthly_analysis_count_reset_at: 2.months.ago
      )

      user.reset_monthly_analysis_count_if_needed!(Time.zone.parse('2026-04-15 10:00:00'))

      expect(user.reload.monthly_analysis_count).to eq(0)
      expect(user.monthly_analysis_count_reset_at).to eq(Time.zone.parse('2026-04-01 00:00:00'))
    end

    it 'keeps the count when already in the current month' do
      current_month = Time.zone.parse('2026-04-01 00:00:00')
      user = create(
        :user,
        monthly_analysis_count: 4,
        monthly_analysis_count_reset_at: current_month
      )

      user.reset_monthly_analysis_count_if_needed!(Time.zone.parse('2026-04-15 10:00:00'))

      expect(user.reload.monthly_analysis_count).to eq(4)
      expect(user.monthly_analysis_count_reset_at).to eq(current_month)
    end
  end

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
