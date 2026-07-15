require 'rails_helper'

# user_sessions テーブル導入後のセッション管理の振る舞い
# （多端末ログイン・トークンローテーション・端末別ログアウト・レガシー移行）
RSpec.describe 'Auth sessions (refresh token digest)', type: :request do
  let!(:user) { create(:user, email: 'session@example.com') }
  let(:host) { { 'HOST' => 'backend' } }

  def login!
    post '/auth/login', params: { email: user.email, password: 'password123' }, as: :json, headers: host
    expect(response).to have_http_status(:ok)
    response.cookies['refresh_token']
  end

  def refresh_with(token)
    post '/auth/refresh', headers: host.merge('Cookie' => "refresh_token=#{token}"), as: :json
  end

  describe 'ログイン' do
    it 'user_sessions レコードが作成され、DBにはdigestのみ保存される' do
      raw_token = nil
      expect { raw_token = login! }.to change(UserSession, :count).by(1)

      session = user.user_sessions.last
      expect(session.refresh_token_digest).not_to eq(raw_token)
      expect(UserSession.find_active_by_token(raw_token)).to eq(session)
      expect(session.expires_at).to be > Time.current
    end

    it '2回ログインしても先のセッションは生きている（多端末対応）' do
      token_a = login!
      token_b = login!

      expect(user.user_sessions.active.count).to eq(2)
      expect(UserSession.find_active_by_token(token_a)).to be_present
      expect(UserSession.find_active_by_token(token_b)).to be_present
    end

    it '有効セッションは上限件数まで（超過分は古い順に失効）' do
      (UserSession::MAX_ACTIVE_SESSIONS + 2).times { login! }
      expect(user.user_sessions.active.count).to eq(UserSession::MAX_ACTIVE_SESSIONS)
    end
  end

  describe 'POST /auth/refresh' do
    it 'トークンがローテーションされ、旧トークンは使えなくなる' do
      old_token = login!

      refresh_with(old_token)
      expect(response).to have_http_status(:ok)
      new_token = response.cookies['refresh_token']
      expect(new_token).not_to eq(old_token)

      # 旧トークンでの再リフレッシュは拒否される
      refresh_with(old_token)
      expect(response).to have_http_status(:unauthorized)

      # 新トークンは有効
      refresh_with(new_token)
      expect(response).to have_http_status(:ok)
    end

    it '失効済みセッションのトークンは 401' do
      token = login!
      UserSession.find_active_by_token(token).revoke!

      refresh_with(token)
      expect(response).to have_http_status(:unauthorized)
    end

    it '期限切れセッションのトークンは 401' do
      token = login!
      UserSession.find_active_by_token(token).update!(expires_at: 1.minute.ago)

      refresh_with(token)
      expect(response).to have_http_status(:unauthorized)
    end

    it 'レガシー（users.refresh_token）のトークンはセッションへ透過的に移行される' do
      legacy_token = SecureRandom.urlsafe_base64(64)
      user.update_column(:refresh_token, legacy_token)

      expect { refresh_with(legacy_token) }.to change(UserSession, :count).by(1)
      expect(response).to have_http_status(:ok)
      expect(user.reload.refresh_token).to be_nil

      # 発行された新トークンで継続利用できる
      refresh_with(response.cookies['refresh_token'])
      expect(response).to have_http_status(:ok)
    end
  end

  describe 'POST /auth/logout' do
    it '該当セッションだけが失効し、他端末のセッションは維持される' do
      token_a = login!
      token_b = login!

      post '/auth/logout', headers: host.merge('Cookie' => "refresh_token=#{token_a}"), as: :json
      expect(response).to have_http_status(:ok)

      expect(UserSession.find_active_by_token(token_a)).to be_nil
      expect(UserSession.find_active_by_token(token_b)).to be_present
    end
  end

  describe 'PATCH /auth/convert_trial' do
    let!(:trial_user) do
      create(:user, trial_user: true, email: 'trial-session@example.com', password: 'password123',
                    password_confirmation: 'password123')
    end

    it '昇格時に旧セッションが全て失効し、新セッションだけが有効になる' do
      post '/auth/login', params: { email: trial_user.email, password: 'password123' }, as: :json, headers: host
      old_token = response.cookies['refresh_token']
      access_token = response.cookies['access_token']

      patch '/auth/convert_trial',
            params: { user: { email: 'converted@example.com', username: 'converted',
                              password: 'newpass123', password_confirmation: 'newpass123' } },
            headers: host.merge('Cookie' => "access_token=#{access_token}; refresh_token=#{old_token}"),
            as: :json
      expect(response).to have_http_status(:ok)

      expect(UserSession.find_active_by_token(old_token)).to be_nil
      new_token = response.cookies['refresh_token']
      expect(UserSession.find_active_by_token(new_token)).to be_present
      expect(UserSession.find_active_by_token(new_token).user).to eq(trial_user)
    end
  end
end
