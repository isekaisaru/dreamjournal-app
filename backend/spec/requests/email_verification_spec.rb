require 'rails_helper'

# メールアドレス有効化（account activation）の振る舞い
# 設計: docs/auth-hardening-spec.md（PR2）
RSpec.describe 'Email verification', type: :request do
  include ActiveJob::TestHelper

  let(:host) { { 'HOST' => 'backend' } }

  around do |example|
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
  ensure
    ActiveJob::Base.queue_adapter = original_adapter
  end

  describe 'POST /auth/register' do
    let(:register_params) do
      { user: { username: 'verifyuser', email: 'verify@example.com',
                password: 'password123', password_confirmation: 'password123' } }
    end

    it '登録直後は未検証で、確認メールが送信される' do
      expect {
        post '/auth/register', params: register_params, as: :json, headers: host
      }.to have_enqueued_mail(UserMailer, :email_verification)

      expect(response).to have_http_status(:created)
      user = User.find_by(email: 'verify@example.com')
      expect(user.email_verified?).to be false
      expect(user.email_verification_token_digest).to be_present
      expect(user.email_verification_sent_at).to be_present
    end
  end

  describe 'POST /auth/verify_email' do
    let!(:user) { create(:user, :unverified) }

    it '有効なトークンで検証が完了する' do
      token = user.generate_email_verification_token!

      post '/auth/verify_email', params: { token: token }, as: :json, headers: host

      expect(response).to have_http_status(:ok)
      expect(user.reload.email_verified?).to be true
      expect(user.email_verification_token_digest).to be_nil
    end

    it '不正なトークンは 422' do
      post '/auth/verify_email', params: { token: 'bogus-token' }, as: :json, headers: host

      expect(response).to have_http_status(:unprocessable_content)
      expect(user.reload.email_verified?).to be false
    end

    it '期限切れ（24時間超）のトークンは 422' do
      token = user.generate_email_verification_token!
      user.update_column(:email_verification_sent_at, 25.hours.ago)

      post '/auth/verify_email', params: { token: token }, as: :json, headers: host

      expect(response).to have_http_status(:unprocessable_content)
      expect(user.reload.email_verified?).to be false
    end

    it '未ログインでも実行できる（メールリンクから直接開くため）' do
      token = user.generate_email_verification_token!
      post '/auth/verify_email', params: { token: token }, as: :json, headers: host
      expect(response).to have_http_status(:ok)
    end
  end

  describe 'POST /auth/resend_verification' do
    let!(:user) { create(:user, :unverified, email: 'resend@example.com') }

    it '未検証ユーザーは再送できる' do
      expect {
        authenticated_post('/auth/resend_verification', user)
      }.to have_enqueued_mail(UserMailer, :email_verification)

      expect(response).to have_http_status(:ok)
    end

    it '5分以内の連続再送は 429' do
      user.update_column(:email_verification_sent_at, 1.minute.ago)

      authenticated_post('/auth/resend_verification', user)
      expect(response).to have_http_status(:too_many_requests)
    end

    it '検証済みユーザーには送らない' do
      user.update_column(:email_verified_at, Time.current)

      expect {
        authenticated_post('/auth/resend_verification', user)
      }.not_to have_enqueued_mail(UserMailer, :email_verification)

      expect(response).to have_http_status(:ok)
      expect(json_response['email_verified']).to be true
    end
  end

  describe 'PATCH /auth/convert_trial' do
    let!(:trial_user) do
      create(:user, trial_user: true, email: 'trial-verify@example.com',
                    password: 'password123', password_confirmation: 'password123')
    end

    it '昇格時の新メールアドレスは未検証になり、確認メールが送られる' do
      expect {
        authenticated_patch('/auth/convert_trial', trial_user, params: {
          user: { email: 'real-verify@example.com', username: 'realverify',
                  password: 'newpass123', password_confirmation: 'newpass123' }
        })
      }.to have_enqueued_mail(UserMailer, :email_verification)

      expect(response).to have_http_status(:ok)
      expect(json_response['user']['email_verified']).to be false
      expect(trial_user.reload.email_verified?).to be false
    end
  end

  describe 'GET /auth/me' do
    it 'email_verified を含む' do
      user = create(:user)
      authenticated_get('/auth/me', user)

      expect(response).to have_http_status(:ok)
      expect(json_response['user']['email_verified']).to be true
    end
  end

  describe 'POST /checkout の検証ゲート' do
    it '未検証の本登録ユーザーは 403 + email_verification_required' do
      user = create(:user, :unverified)
      authenticated_post('/checkout', user, params: { plan: 'donation' })

      expect(response).to have_http_status(:forbidden)
      expect(json_response['email_verification_required']).to be true
    end

    it 'トライアルユーザーは検証ゲートの対象外（403にならない）' do
      trial = create(:user, :unverified, trial_user: true)
      authenticated_post('/checkout', trial, params: { plan: 'donation' })

      # ゲートでは弾かれない（Stripe設定等の別要因のエラーは許容するが403ではない）
      expect(response).not_to have_http_status(:forbidden)
    end
  end

  describe 'UserMailer#email_verification' do
    it '確認URLとトークンが本文に含まれる' do
      user = create(:user, :unverified, email: 'mailbody@example.com')
      token = user.generate_email_verification_token!

      mail = UserMailer.email_verification(user, token)

      expect(mail.to).to eq(['mailbody@example.com'])
      expect(mail.subject).to include('メールアドレスの確認')
      # マルチパート（text/html）それぞれに確認URLが含まれる
      expect(mail.text_part.decoded).to include("/verify-email?token=#{token}")
      expect(mail.html_part.decoded).to include("/verify-email?token=#{token}")
    end
  end
end
