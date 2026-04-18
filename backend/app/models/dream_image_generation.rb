class DreamImageGeneration < ApplicationRecord
  belongs_to :dream, optional: false
  belongs_to :user, optional: false

  validates :generated_at, presence: true

  scope :generated_in_month, ->(date = Time.current) {
    where(generated_at: date.beginning_of_month..date.end_of_month)
  }
end
