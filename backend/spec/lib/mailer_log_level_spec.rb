require 'rails_helper'

# メール本文（＝パスワードリセットURL）をログに出さないための安全弁。
# 背景は lib/mailer_log_level.rb のコメント参照。
RSpec.describe MailerLogLevel do
  describe '.safe_level' do
    it 'debug でも INFO まで引き上げる（本文を出させない）' do
      expect(described_class.safe_level(Logger::DEBUG)).to eq(Logger::INFO)
    end

    it 'info はそのまま' do
      expect(described_class.safe_level(Logger::INFO)).to eq(Logger::INFO)
    end

    it 'warn / error はそのまま（余計に饒舌にしない）' do
      expect(described_class.safe_level(Logger::WARN)).to eq(Logger::WARN)
      expect(described_class.safe_level(Logger::ERROR)).to eq(Logger::ERROR)
    end

    it '返す値が必ず INFO 以上（＝debug を許さない）' do
      [Logger::DEBUG, Logger::INFO, Logger::WARN, Logger::ERROR, Logger::FATAL].each do |level|
        expect(described_class.safe_level(level)).to be >= Logger::INFO
      end
    end
  end
end
