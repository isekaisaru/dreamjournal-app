# frozen_string_literal: true

class DreamProfile < ApplicationRecord
  RELATIONSHIPS = %w[self partner child parent friend pet other].freeze
  MAX_ACTIVE_COUNT = 5

  belongs_to :user
  has_many :dreams, dependent: :nullify

  validates :name,         presence: true, length: { maximum: 30 }
  validates :avatar_emoji, presence: true
  validates :color,        presence: true,
                           format: { with: /\A#[0-9a-fA-F]{6}\z/,
                                     message: "は # から始まる6桁の16進数で指定してください" }
  validates :relationship, inclusion: { in: RELATIONSHIPS }

  validate :active_count_within_limit, if: -> { active? }
  validate :self_profile_not_archived, if: -> { !active? && relationship == "self" }
  validate :self_profile_unique_per_user, if: -> { relationship == "self" }

  private

  def active_count_within_limit
    return unless user

    scope = user.dream_profiles.where(active: true)
    scope = scope.where.not(id: id) if persisted?
    return if scope.count < MAX_ACTIVE_COUNT

    errors.add(:base, "アクティブなプロフィールは#{MAX_ACTIVE_COUNT}件までです")
  end

  def self_profile_not_archived
    errors.add(:base, "「自分」プロフィールはアーカイブできません")
  end

  def self_profile_unique_per_user
    return unless user

    scope = user.dream_profiles.where(relationship: "self")
    scope = scope.where.not(id: id) if persisted?
    return unless scope.exists?

    errors.add(:relationship, "「自分」プロフィールはアカウントごとに1件のみ登録できます")
  end
end
