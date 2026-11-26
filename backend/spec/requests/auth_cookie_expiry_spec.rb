require 'rails_helper'

# ログイン用の Cookie に有効期限（expires）が付いていないと、ブラウザを閉じたときに
# Cookie ごと消えてしまい、サーバー側のセッション（30 日）が残っていてもログアウトされる。
# 期限をサーバー側のトークン寿命にそろえて付ける。
RSpec.describe 'Auth cookies の有効期限', type: :request do
  let!(:user) { create(:user, email: 'cookie-expiry@example.com') }
  let(:host) { { 'HOST' => 'backend' } }

  def set_cookie_line(name)
    lines = Array(response.headers['Set-Cookie']).flat_map { |h| h.to_s.split("\n") }
    lines.find { |l| l.start_with?("#{name}=") }
  end

  def expires_of(name)
    line = set_cookie_line(name)
    expect(line).to be_present, "#{name} の Set-Cookie がない"
    value = line[/expires=([^;]+)/i, 1]
    value && Time.httpdate(value.strip)
  end

  it 'ログイン時、refresh_token は 30 日、access_token は JWT と同じ寿命の期限が付く' do
    post '/auth/login', params: { email: user.email, password: 'password123' }, as: :json, headers: host
    expect(response).to have_http_status(:ok)

    expect(expires_of('refresh_token')).to be_within(5.seconds).of(AuthService.refresh_token_lifetime.from_now)
    expect(expires_of('access_token')).to be_within(5.seconds).of(Time.zone.at(AuthService.jwt_expiration_time))
  end

  it 'トークン更新（refresh）のときも期限が付き直す' do
    post '/auth/login', params: { email: user.email, password: 'password123' }, as: :json, headers: host
    token = response.cookies['refresh_token']

    post '/auth/refresh', headers: host.merge('Cookie' => "refresh_token=#{token}"), as: :json
    expect(response).to have_http_status(:ok)

    expect(expires_of('refresh_token')).to be_within(5.seconds).of(AuthService.refresh_token_lifetime.from_now)
    expect(expires_of('access_token')).to be_present
  end

  it 'Cookie の安全設定（HttpOnly）は今までどおり' do
    post '/auth/login', params: { email: user.email, password: 'password123' }, as: :json, headers: host

    expect(set_cookie_line('access_token')).to match(/httponly/i)
    expect(set_cookie_line('refresh_token')).to match(/httponly/i)
  end
end
