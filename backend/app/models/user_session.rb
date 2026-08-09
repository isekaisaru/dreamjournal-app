# frozen_string_literal: true

# refresh token 1本につき1レコード（＝ログイン中の端末1つ分）。
# トークン本文は保存せず SHA256 digest のみを持つ。
# 設計: docs/auth-hardening-spec.md（PR1）
class UserSession < ApplicationRecord
  # 1ユーザーが同時に保持できる有効セッション数（端末数の上限）
  MAX_ACTIVE_SESSIONS = 5

  belongs_to :user

  validates :refresh_token_digest, presence: true, uniqueness: true
  validates :expires_at, presence: true

  scope :active, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  # refresh token は 512bit のランダム値なので、レインボーテーブル攻撃は
  # entropy 側で守られる。等値検索（インデックス）が必要なため bcrypt ではなく
  # 決定的な SHA256 を使う。
  def self.digest(token)
    Digest::SHA256.hexdigest(token)
  end

  def self.find_active_by_token(token)
    return nil if token.blank?

    active.find_by(refresh_token_digest: digest(token))
  end

  # 上限を超えた古いセッションを失効させる（多端末対応の暴走防止）
  def self.prune_for(user)
    overflow = user.user_sessions.active.order(created_at: :desc).offset(MAX_ACTIVE_SESSIONS)
    overflow.update_all(revoked_at: Time.current)
  end

  def revoke!
    update!(revoked_at: Time.current)
  end

  def rotate!(new_token, lifetime:)
    update!(
      refresh_token_digest: self.class.digest(new_token),
      expires_at: lifetime.from_now,
      last_used_at: Time.current
    )
  end
end
