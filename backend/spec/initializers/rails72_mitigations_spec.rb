require 'rails_helper'

# Rails 7.2 には修正版が出ていない警告への暫定策を守る回帰テスト。
# Rails 8.0.5.2 以降へ上げたら、暫定策と一緒に見直す。
# - GHSA-v924-7rp8-4mxh: 添付時の解析で ffprobe / ffmpeg / ImageMagick が拡張子からデコーダを選ぶ
# - GHSA-8474-xrp6-wh69: Action Cable の subscribe が safe_constantize に未検証の値を渡す
RSpec.describe 'Rails 7.2 の警告への暫定策' do
  describe 'アップロードしたファイルの解析' do
    it '外部ツールで解析する analyzer と previewer を使わない' do
      expect(ActiveStorage.analyzers).to be_empty
      expect(ActiveStorage.previewers).to be_empty
    end

    [
      ['audio/webm', ActiveStorage::Analyzer::AudioAnalyzer],
      ['video/mp4', ActiveStorage::Analyzer::VideoAnalyzer]
    ].each do |content_type, analyzer|
      it "#{content_type} を解析しても #{analyzer.name.demodulize} を使わない" do
        allow(analyzer).to receive(:new).and_call_original
        blob = ActiveStorage::Blob.create_and_upload!(
          io: StringIO.new('synthetic upload'),
          filename: 'dream.avs',
          content_type: content_type,
          identify: false
        )

        blob.analyze

        expect(analyzer).not_to have_received(:new)
        expect(blob.reload).to be_analyzed
      end
    end
  end

  it 'Action Cable の入口（/cable）をルーティングに置かない' do
    paths = Rails.application.routes.routes.map { |route| route.path.spec.to_s }

    expect(Rails.application.config.action_cable.mount_path).to be_nil
    expect(paths.grep(%r{\A/cable})).to be_empty
  end

  it '別の名前でも Action Cable のサーバーをルーティングに置かない' do
    apps = Rails.application.routes.routes.map do |route|
      route.app.respond_to?(:app) ? route.app.app : route.app
    end

    expect(apps).not_to include(ActionCable.server)
  end
end
