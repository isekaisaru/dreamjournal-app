class AiUsageLog < ApplicationRecord
  FEATURES = %w[dream_analysis image_generation monthly_summary].freeze

  belongs_to :user

  validates :feature, presence: true, inclusion: { in: FEATURES }

  # 指定ユーザーの今日の利用ログ
  scope :today_for_user, ->(user, feature) {
    where(user: user, feature: feature)
      .where(created_at: Time.current.beginning_of_day..)
  }

  # 指定ユーザーの今月の利用ログ
  scope :this_month_for_user, ->(user, feature) {
    where(user: user, feature: feature)
      .where(created_at: Time.current.beginning_of_month..)
  }
end
