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

    it 'resets the count when reset_at is nil (new user)' do
      user = create(:user, monthly_analysis_count: 3, monthly_analysis_count_reset_at: nil)

      user.reset_monthly_analysis_count_if_needed!(Time.zone.parse('2026-04-15 10:00:00'))

      expect(user.reload.monthly_analysis_count).to eq(0)
      expect(user.monthly_analysis_count_reset_at).to eq(Time.zone.parse('2026-04-01 00:00:00'))
    end
  end

  describe '#increment_monthly_analysis_count!' do
    it 'increments the count within the same month' do
      user = create(
        :user,
        monthly_analysis_count: 2,
        monthly_analysis_count_reset_at: Time.zone.parse('2026-04-01 00:00:00')
      )

      user.increment_monthly_analysis_count!(Time.zone.parse('2026-04-15 10:00:00'))

      expect(user.reload.monthly_analysis_count).to eq(3)
    end

    it 'resets then increments to 1 when month is stale' do
      user = create(
        :user,
        monthly_analysis_count: 5,
        monthly_analysis_count_reset_at: 2.months.ago
      )

      user.increment_monthly_analysis_count!(Time.zone.parse('2026-04-15 10:00:00'))

      expect(user.reload.monthly_analysis_count).to eq(1)
    end
  end

  describe '#reserve_monthly_analysis_slot!' do
    it 'increments and returns true when under the limit' do
      user = create(:user, monthly_analysis_count: 5,
                           monthly_analysis_count_reset_at: Time.zone.parse('2026-04-01'))

      result = user.reserve_monthly_analysis_slot!(Time.zone.parse('2026-04-15 10:00:00'))

      expect(result).to be true
      expect(user.reload.monthly_analysis_count).to eq(6)
    end

    it 'returns false and does not increment when at the limit' do
      user = create(:user, monthly_analysis_count: User::FREE_ANALYSIS_MONTHLY_LIMIT,
                           monthly_analysis_count_reset_at: Time.zone.parse('2026-04-01'))

      result = user.reserve_monthly_analysis_slot!(Time.zone.parse('2026-04-15 10:00:00'))

      expect(result).to be false
      expect(user.reload.monthly_analysis_count).to eq(User::FREE_ANALYSIS_MONTHLY_LIMIT)
    end

    it 'resets stale count then reserves the slot' do
      user = create(:user, monthly_analysis_count: 8,
                           monthly_analysis_count_reset_at: 2.months.ago)

      result = user.reserve_monthly_analysis_slot!(Time.zone.parse('2026-04-15 10:00:00'))

      expect(result).to be true
      expect(user.reload.monthly_analysis_count).to eq(1)
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
