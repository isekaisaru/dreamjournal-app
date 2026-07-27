require 'rails_helper'

# 「メールが送られていないのに気づけない」状態を防ぐための設定チェック。
# 背景は lib/mail_delivery_config.rb のコメント参照。
RSpec.describe MailDeliveryConfig do
  # 本物の ENV を汚さないよう、判定対象は引数で渡す
  let(:complete_env) do
    {
      'SMTP_USERNAME' => 'resend',
      'SMTP_PASSWORD' => 'dummy-api-key',
      'MAIL_FROM' => 'no-reply@example.com'
    }
  end

  describe '.missing_env_keys' do
    it 'すべて揃っていれば空を返す' do
      expect(described_class.missing_env_keys(complete_env)).to be_empty
    end

    it '欠けているキーだけを返す' do
      env = complete_env.merge('MAIL_FROM' => nil)

      expect(described_class.missing_env_keys(env)).to eq(['MAIL_FROM'])
    end

    it '空文字は未設定として扱う' do
      env = complete_env.merge('SMTP_PASSWORD' => '')

      expect(described_class.missing_env_keys(env)).to eq(['SMTP_PASSWORD'])
    end

    it '空白だけの値も未設定として扱う' do
      env = complete_env.merge('SMTP_USERNAME' => '   ')

      expect(described_class.missing_env_keys(env)).to eq(['SMTP_USERNAME'])
    end

    it '何も設定されていなければ3つとも返す' do
      expect(described_class.missing_env_keys({}))
        .to match_array(%w[SMTP_USERNAME SMTP_PASSWORD MAIL_FROM])
    end
  end

  describe '.configured?' do
    it 'すべて揃っていれば true' do
      expect(described_class.configured?(complete_env)).to be true
    end

    it '1つでも欠ければ false' do
      expect(described_class.configured?(complete_env.merge('MAIL_FROM' => nil))).to be false
    end
  end

  describe '.warning_message' do
    it '設定が揃っていれば nil（警告しない）' do
      expect(described_class.warning_message(complete_env)).to be_nil
    end

    it '不足しているキー名を含む警告を返す' do
      env = complete_env.merge('MAIL_FROM' => nil, 'SMTP_PASSWORD' => nil)
      message = described_class.warning_message(env)

      expect(message).to include('SMTP_PASSWORD')
      expect(message).to include('MAIL_FROM')
      expect(message).to include('配信されません')
    end

    it '設定値そのものは含めない（APIキーを漏らさない）' do
      env = complete_env.merge('MAIL_FROM' => nil)
      message = described_class.warning_message(env)

      expect(message).not_to include('dummy-api-key')
      expect(message).not_to include('resend')
    end
  end
end
