require 'rails_helper'

# 夢のタイトル・本文がユーザーの機微な自由記述であるにもかかわらず、
# 本番ログに平文で残っていた問題への回帰テスト。
#
# 原因は2つあった：
# (1) DreamsController#create が `Rails.logger.info "Params: #{params.inspect}"`
#     を無条件に実行し、paramsの全内容（夢の本文含む）をそのままログへ出していた。
# (2) filter_parameters に :title / :content が含まれておらず、Railsが自動で出す
#     「Parameters: {...}」ログ（ActionController::LogSubscriberによるもの）でも
#     マスクされない状態だった。
#
# (1)は該当の手動ログ呼び出しを削除して対応し、(2)はfilter_parametersへ追加して対応した。
RSpec.describe '夢本文が本番ログに残らないための保護' do
  # 本物の夢の内容とは混同しない合成マーカー。
  SYNTHETIC_TITLE   = 'SYNTHETIC_DREAM_TITLE_DO_NOT_LEAK'.freeze
  SYNTHETIC_CONTENT = 'SYNTHETIC_DREAM_CONTENT_DO_NOT_LEAK'.freeze

  describe '設定値そのもの（filter_parameters）' do
    it 'filter_parameters に :title と :content が含まれている' do
      expect(Rails.application.config.filter_parameters).to include(:title, :content)
    end

    it 'ActiveSupport::ParameterFilter で実際にマスクされる' do
      filter = ActiveSupport::ParameterFilter.new(Rails.application.config.filter_parameters)
      filtered = filter.filter(title: SYNTHETIC_TITLE, content: SYNTHETIC_CONTENT)

      expect(filtered[:title]).to eq('[FILTERED]')
      expect(filtered[:content]).to eq('[FILTERED]')
    end

    # 「この設定が無いと本当に漏れる」ことを示す対照実験。
    # これが失敗するようになったら、フィルタ以外の仕組みで保護されていることになるので、
    # テストの前提を見直す合図になる。
    it '対照実験: :title / :content を外すとマスクされない（検知力の確認）' do
      filter = ActiveSupport::ParameterFilter.new(
        Rails.application.config.filter_parameters - [:title, :content]
      )
      filtered = filter.filter(title: SYNTHETIC_TITLE, content: SYNTHETIC_CONTENT)

      expect(filtered[:title]).to eq(SYNTHETIC_TITLE)
      expect(filtered[:content]).to eq(SYNTHETIC_CONTENT)
    end
  end

  describe 'POST /dreams の実際のログ出力（動作ベース）', type: :request do
    let!(:user) { create(:user, :with_self_profile) }
    let(:log_output) { StringIO.new }

    around do |example|
      original_logger = Rails.logger

      captured_logger = ActiveSupport::Logger.new(log_output)
      captured_logger.level = Logger::DEBUG
      Rails.logger = captured_logger
      # ActionController::Base はRailtieの起動時にRails.loggerを一度キャプチャして
      # 保持しているため、コントローラ側のロガーも明示的に差し替える。
      ActionController::Base.logger = captured_logger

      example.run
    ensure
      Rails.logger = original_logger
      ActionController::Base.logger = original_logger
    end

    it '夢の本文（合成マーカー）がログに出ない' do
      authenticated_post(
        '/dreams',
        user,
        params: { dream: { title: SYNTHETIC_TITLE, content: SYNTHETIC_CONTENT } }
      )

      expect(response).to have_http_status(:created)
      expect(log_output.string).not_to include(SYNTHETIC_TITLE)
      expect(log_output.string).not_to include(SYNTHETIC_CONTENT)
    end

    it 'リクエスト自体のログは残る（調査に必要な情報まで消していないことの確認）' do
      authenticated_post(
        '/dreams',
        user,
        params: { dream: { title: SYNTHETIC_TITLE, content: SYNTHETIC_CONTENT } }
      )

      expect(log_output.string).to include('DreamsController#create called')
      expect(log_output.string).to match(/Started POST "\/dreams"/)
    end
  end
end
