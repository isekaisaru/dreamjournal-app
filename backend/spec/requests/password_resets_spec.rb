require 'rails_helper'
# ActiveJobのテスト用ヘルパーを読み込みます
require 'active_job/test_helper'

RSpec.describe 'PasswordResets API', type: :request do
  # テスト内で `perform_enqueued_jobs` などのヘルパーメソッドを使えるようにします
  include ActiveJob::TestHelper

  let!(:user) { create(:user, email: 'test@example.com', password: 'password123') }

  describe 'POST /password_resets' do
    context '存在するメールアドレスの場合' do
      it '200 OKを返し、パスワードリセットメールを送信キューに入れる' do
        expect {
          # perform_enqueued_jobsブロック内でリクエストを実行することで、
          # deliver_laterでキューに入れられたジョブをその場で即座に実行させます。
          perform_enqueued_jobs do
            post '/password_resets', params: { email: user.email }, as: :json, headers: { 'HOST' => 'backend' }
          end
        }.to change { ActionMailer::Base.deliveries.count }.by(1)

        # 2. レスポンスとDBの状態を確認
        expect(response).to have_http_status(:ok)
        expect(json_response['message']).to include('メールを送信しました')
        expect(user.reload.reset_password_token).not_to be_nil

        # 3. 実際に送信されたメールの内容を検証
        sent_email = ActionMailer::Base.deliveries.last
        expect(sent_email.to).to include(user.email)
        expect(sent_email.subject).to eq('[ユメログ] パスワードリセット')
        text_body = sent_email.text_part.body.to_s
        expect(text_body).to include(user.reload.reset_password_token)
      end
    end

    context '存在しないメールアドレスの場合' do
      it 'ユーザー列挙攻撃を防ぐため、200 OKを返す' do
        expect {
          post '/password_resets', params: { email: 'nonexistent@example.com' }, as: :json, headers: { 'HOST' => 'backend' }
        }.not_to change(ActionMailer::Base.deliveries, :count)

        expect(response).to have_http_status(:ok)
        expect(json_response['message']).to include('メールを送信しました')
      end
    end
  end

  describe 'PATCH /password_resets/:id' do
    let!(:token) { user.generate_password_reset_token; user.reset_password_token }

    context '有効なトークンと有効なパスワードの場合' do
      let(:valid_password_params) { { password: 'new_password_456', password_confirmation: 'new_password_456' } }

      it 'パスワードを更新し、トークンを無効化する' do
        patch "/password_resets/#{token}", params: valid_password_params, as: :json, headers: { 'HOST' => 'backend' }

        expect(response).to have_http_status(:ok)
        expect(json_response['message']).to eq('パスワードが正常に更新されました。')
        expect(user.reload.reset_password_token).to be_nil
        expect(user.reload.authenticate('new_password_456')).to be_truthy
      end
    end

    context 'パスワードが一致しない場合' do
      let(:mismatched_params) { { password: 'new_password_456', password_confirmation: 'wrong_confirmation' } }

      it '422 Unprocessable Entityを返し、エラーメッセージを表示する' do
        patch "/password_resets/#{token}", params: mismatched_params, as: :json, headers: { 'HOST' => 'backend' }
        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response['errors']).to include("Password confirmation doesn't match Password")
      end
    end

    context '期限切れのトークンの場合' do
      it '422 Unprocessable Entityを返す' do
        user.update_column(:reset_password_sent_at, 2.hours.ago)
        patch "/password_resets/#{token}", params: { password: 'new_password_456', password_confirmation: 'new_password_456' }, as: :json, headers: { 'HOST' => 'backend' }
        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response['error']).to eq('無効または期限切れのトークンです。')
      end
    end

    context '無効なトークンの場合' do
      it '422 Unprocessable Entityを返す' do
        patch "/password_resets/invalid-token", params: { password: 'new_password_456', password_confirmation: 'new_password_456' }, as: :json, headers: { 'HOST' => 'backend' }
        expect(response).to have_http_status(:unprocessable_content)
        expect(json_response['error']).to eq('無効または期限切れのトークンです。')
      end
    end
  end
end
