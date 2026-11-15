require 'rails_helper'

# sentry-ruby 7 でログとメトリクスが既定で送られるようになったため、
# config/initializers/sentry.rb で送らない設定にしている。その設定と、
# send_default_pii = false のときの厳しい既定（data_collection）が保たれていることを守る回帰テスト。
RSpec.describe 'Sentry のログ・メトリクスと集めるデータの設定' do
  let(:configuration) { Sentry.configuration }

  describe 'ログとメトリクス' do
    it 'ログは送る直前にすべて捨てる' do
      expect(configuration.before_send_log).to respond_to(:call)
      expect(configuration.before_send_log.call(double('log'))).to be_nil
      expect(configuration.before_send_log.call(double('log'), {})).to be_nil
    end

    it 'メトリクスは送る直前にすべて捨てる' do
      expect(configuration.before_send_metric).to respond_to(:call)
      expect(configuration.before_send_metric.call(double('metric'))).to be_nil
      expect(configuration.before_send_metric.call(double('metric'), {})).to be_nil
    end

    it 'Rails の構造化ログを送らない' do
      expect(configuration.rails.structured_logging.enabled?).to be(false)
    end
  end

  describe '集めるデータ（send_default_pii = false の既定）' do
    it '個人情報を送る旧設定を有効にしていない' do
      expect(configuration.send_default_pii).to be(false)
    end

    it 'ユーザー情報・Cookie・リクエスト本文・クエリ文字列を送らない' do
      data_collection = configuration.data_collection

      expect(data_collection.user_info).to be(false)
      expect(data_collection.cookies.mode).to eq(:off)
      expect(data_collection.http_bodies).to eq([])
      expect(data_collection.url_query_params.mode).to eq(:off)
    end
  end
end
