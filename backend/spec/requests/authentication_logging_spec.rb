require 'rails_helper'

RSpec.describe 'Authentication secret logging', type: :request do
  let!(:user) do
    create(
      :user,
      email: 'security-log-user@example.com',
      username: 'security_log_user',
      password: login_password,
      password_confirmation: login_password
    )
  end
  let(:login_password) { 'SecretPassword123' }
  let(:recorded_logs) { [] }

  before do
    %i[debug info warn error fatal].each do |level|
      allow(Rails.logger).to receive(level) do |message = nil, **fields|
        recorded_logs << message.to_s
        recorded_logs << fields.to_s unless fields.empty?
      end
    end
  end

  def expect_sensitive_values_absent(named_values)
    log_output = recorded_logs.join("\n")
    leaked_labels = named_values.filter_map do |label, value|
      label if value.present? && log_output.include?(value.to_s)
    end

    # Failure output contains labels only. Secret values never become matcher output.
    expect(leaked_labels).to be_empty
  end

  def token_fragments(token)
    return [] if token.blank?

    [token.to_s.first(8), token.to_s.last(8)]
  end

  def named_secret_and_fragments(label, value)
    prefix, suffix = token_fragments(value)
    {
      label => value,
      "#{label} prefix" => prefix,
      "#{label} suffix" => suffix
    }
  end

  def named_payload_formats(label, payload)
    {
      "#{label} Ruby Hash inspect" => payload.inspect,
      "#{label} JSON" => JSON.generate(payload)
    }
  end

  it 'does not log credentials or issued tokens after a successful login' do
    authorization_marker = SecureRandom.urlsafe_base64(48)
    cookie_marker = SecureRandom.urlsafe_base64(48)

    post '/auth/login',
         params: { email: user.email, password: login_password },
         as: :json,
         headers: {
           'Authorization' => "Bearer #{authorization_marker}",
           'Cookie' => "security_audit_marker=#{cookie_marker}",
           'HOST' => 'backend'
         }

    expect(response).to have_http_status(:ok)
    access_token = response.cookies['access_token']
    refresh_token = response.cookies['refresh_token']
    decoded_payload = JWT.decode(
      access_token,
      AuthService::SECRET_KEY,
      true,
      algorithm: 'HS256'
    ).first

    expect_sensitive_values_absent(
      {
        'login email' => user.email,
        'login password' => login_password
      }
        .merge(named_secret_and_fragments('Authorization marker', authorization_marker))
        .merge(named_secret_and_fragments('Cookie marker', cookie_marker))
        .merge(named_secret_and_fragments('login access token', access_token))
        .merge(named_secret_and_fragments('login refresh token', refresh_token))
        .merge(named_payload_formats('login JWT payload', decoded_payload))
    )
  end

  it 'does not log submitted credentials after a failed login' do
    rejected_email = 'rejected-security-log-user@example.com'
    rejected_password = 'RejectedPassword456'

    post '/auth/login',
         params: { email: rejected_email, password: rejected_password },
         as: :json,
         headers: { 'HOST' => 'backend' }

    expect(response).to have_http_status(:unauthorized)
    expect_sensitive_values_absent(
      'rejected email' => rejected_email,
      'rejected password' => rejected_password
    )
  end

  it 'does not log old or newly rotated tokens after a successful refresh' do
    post '/auth/login',
         params: { email: user.email, password: login_password },
         as: :json,
         headers: { 'HOST' => 'backend' }
    old_access_token = response.cookies['access_token']
    old_refresh_token = response.cookies['refresh_token']
    recorded_logs.clear

    post '/auth/refresh', as: :json, headers: { 'HOST' => 'backend' }

    expect(response).to have_http_status(:ok)
    new_access_token = response.cookies['access_token']
    new_refresh_token = response.cookies['refresh_token']

    expect_sensitive_values_absent(
      named_secret_and_fragments('old access token', old_access_token)
        .merge(named_secret_and_fragments('old refresh token', old_refresh_token))
        .merge(named_secret_and_fragments('new access token', new_access_token))
        .merge(named_secret_and_fragments('new refresh token', new_refresh_token))
    )
  end

  it 'logs only token presence and fixed failure information for an invalid refresh token' do
    invalid_refresh_token = 'invalid-refresh-token-security-marker'
    allow(Rails.env).to receive(:development?).and_return(true)

    post '/auth/refresh',
         as: :json,
         headers: {
           'Cookie' => "refresh_token=#{invalid_refresh_token}",
           'HOST' => 'backend'
         }

    expect(response).to have_http_status(:unauthorized)
    token_presence_logged = recorded_logs.any? { |message| message.include?('token_present=true') }
    expect(token_presence_logged).to be(true)
    expect_sensitive_values_absent(
      'invalid refresh token' => invalid_refresh_token,
      'invalid refresh token prefix' => token_fragments(invalid_refresh_token).first,
      'invalid refresh token suffix' => token_fragments(invalid_refresh_token).last
    )
  end

  it 'does not log an expired JWT, its prefix, or its decoded payload' do
    expired_payload = { 'user_id' => user.id, 'exp' => 1.minute.ago.to_i }
    expired_token = JWT.encode(
      expired_payload,
      AuthService::SECRET_KEY,
      'HS256'
    )

    expect(AuthService.decode_token(expired_token)).to be_nil
    expect_sensitive_values_absent(
      named_secret_and_fragments('expired JWT', expired_token)
        .merge(named_payload_formats('expired JWT payload', expired_payload))
    )
  end

  it 'does not log an invalid JWT or its prefix' do
    invalid_token = 'invalid.jwt.security-marker'

    expect(AuthService.decode_token(invalid_token)).to be_nil
    expect_sensitive_values_absent(
      'invalid JWT' => invalid_token,
      'invalid JWT prefix' => token_fragments(invalid_token).first,
      'invalid JWT suffix' => token_fragments(invalid_token).last
    )
  end

  it 'does not inspect a registration result that may contain secrets' do
    registration_password = 'RegistrationSecret789'
    access_token = SecureRandom.urlsafe_base64(48)
    refresh_token = SecureRandom.urlsafe_base64(48)

    allow(AuthService).to receive(:register).and_return(
      user: nil,
      access_token: access_token,
      refresh_token: refresh_token
    )

    post '/auth/register',
         params: {
           user: {
             username: 'registration_security_user',
             email: 'registration-security@example.com',
             password: registration_password,
             password_confirmation: registration_password
           }
         },
         as: :json,
         headers: { 'HOST' => 'backend' }

    expect(response).to have_http_status(:internal_server_error)
    expect_sensitive_values_absent(
      {
        'registration email' => 'registration-security@example.com',
        'registration password' => registration_password
      }
        .merge(named_secret_and_fragments('registration access token', access_token))
        .merge(named_secret_and_fragments('registration refresh token', refresh_token))
    )
  end
end
