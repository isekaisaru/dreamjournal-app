require 'rails_helper'

RSpec.describe UserSession, type: :model do
  let(:user) { create(:user) }

  describe 'バリデーション' do
    it { should belong_to(:user) }
    it { should validate_presence_of(:refresh_token_digest) }
    it { should validate_presence_of(:expires_at) }
  end

  describe '.digest' do
    it '同じトークンからは常に同じdigestが得られる（等値検索可能）' do
      expect(UserSession.digest('token-a')).to eq(UserSession.digest('token-a'))
    end

    it 'トークン本文とdigestは一致しない（平文保存しない）' do
      expect(UserSession.digest('token-a')).not_to eq('token-a')
    end
  end

  describe '.find_active_by_token' do
    let(:token) { SecureRandom.urlsafe_base64(64) }
    let!(:session) do
      create(:user_session, user: user, refresh_token_digest: UserSession.digest(token))
    end

    it '有効なセッションを引ける' do
      expect(UserSession.find_active_by_token(token)).to eq(session)
    end

    it 'blank なら nil' do
      expect(UserSession.find_active_by_token(nil)).to be_nil
      expect(UserSession.find_active_by_token('')).to be_nil
    end

    it '失効済みセッションは引けない' do
      session.revoke!
      expect(UserSession.find_active_by_token(token)).to be_nil
    end

    it '期限切れセッションは引けない' do
      session.update!(expires_at: 1.minute.ago)
      expect(UserSession.find_active_by_token(token)).to be_nil
    end
  end

  describe '.prune_for' do
    it '上限を超えた古いセッションを失効させる' do
      sessions = Array.new(UserSession::MAX_ACTIVE_SESSIONS + 2) do |i|
        create(:user_session, user: user, created_at: i.minutes.ago)
      end

      UserSession.prune_for(user)

      expect(user.user_sessions.active.count).to eq(UserSession::MAX_ACTIVE_SESSIONS)
      # 最も古い2件が失効している
      expect(sessions.last(2).map { |s| s.reload.revoked_at }).to all(be_present)
    end
  end

  describe '#rotate!' do
    let(:old_token) { SecureRandom.urlsafe_base64(64) }
    let(:session) do
      create(:user_session, user: user, refresh_token_digest: UserSession.digest(old_token))
    end

    it 'digestを新トークンのものへ差し替え、旧トークンを無効化する' do
      new_token = SecureRandom.urlsafe_base64(64)
      session.rotate!(new_token, lifetime: 30.days)

      expect(UserSession.find_active_by_token(new_token)).to eq(session)
      expect(UserSession.find_active_by_token(old_token)).to be_nil
      expect(session.reload.last_used_at).to be_present
    end
  end
end
