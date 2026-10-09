# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'SECRET_KEY_BASE rotation boundaries' do
  let(:old_secret_key_base) { 'old-secret-key-base-for-isolated-test-only-' * 2 }
  let(:new_secret_key_base) { 'new-secret-key-base-for-isolated-test-only-' * 2 }

  def verifier_for(secret_key_base)
    key = ActiveSupport::KeyGenerator.new(secret_key_base).generate_key('signed payload', 64)
    ActiveSupport::MessageVerifier.new(key, digest: 'SHA256')
  end

  def encryptor_for(secret_key_base)
    key_length = ActiveSupport::MessageEncryptor.key_len
    key = ActiveSupport::KeyGenerator.new(secret_key_base).generate_key('encrypted payload', key_length)
    ActiveSupport::MessageEncryptor.new(key)
  end

  it 'invalidates values signed with the previous Rails secret' do
    signed_value = verifier_for(old_secret_key_base).generate('existing-session-or-signed-id')

    expect(verifier_for(old_secret_key_base).verified(signed_value)).to eq('existing-session-or-signed-id')
    expect(verifier_for(new_secret_key_base).verified(signed_value)).to be_nil
  end

  it 'cannot decrypt values encrypted with the previous Rails secret' do
    encrypted_value = encryptor_for(old_secret_key_base).encrypt_and_sign('encrypted-data')

    expect(encryptor_for(old_secret_key_base).decrypt_and_verify(encrypted_value)).to eq('encrypted-data')
    expect {
      encryptor_for(new_secret_key_base).decrypt_and_verify(encrypted_value)
    }.to raise_error(ActiveSupport::MessageEncryptor::InvalidMessage)
  end

  it 'keeps application JWTs valid because they use JWT_SECRET_KEY independently' do
    jwt_secret = 'isolated-jwt-secret-for-rotation-test'
    stub_const('AuthService::SECRET_KEY', jwt_secret)
    access_token = AuthService.encode_token(123)

    allow(Rails.application).to receive(:secret_key_base).and_return(old_secret_key_base)
    expect(AuthService.decode_token(access_token)).to include('user_id' => 123)

    allow(Rails.application).to receive(:secret_key_base).and_return(new_secret_key_base)
    expect(AuthService.decode_token(access_token)).to include('user_id' => 123)
  end
end
