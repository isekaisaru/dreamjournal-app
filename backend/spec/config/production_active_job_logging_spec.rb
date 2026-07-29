require 'rails_helper'

# Active Job の enqueue / perform ログに、パスワード再設定・メールアドレス確認の
# トークンが残らないことを守る回帰テスト。
#
# ActionMailer::MailDeliveryJob の引数には生トークンが入るため、
# production.rb で `config.active_job.log_arguments = false` を設定している。
# ここでは「設定ファイルに文字列がある」ことだけでなく、
# 実際に ActiveJob のログ購読機構を通して引数が出ないことを確認する。
RSpec.describe 'Active Job のログにジョブ引数を残さない' do
  # 本物のトークンは使わない。混入検知用の合成マーカー。
  SYNTHETIC_JOB_MARKER = 'SYNTHETIC_PASSWORD_RESET_TOKEN_DO_NOT_LEAK'.freeze

  describe '設定値そのもの' do
    it 'ActiveJob が log_arguments 設定に対応している（Rails側の改名を検知する）' do
      expect(ActiveJob::Base).to respond_to(:log_arguments=)
      expect(ActiveJob::Base).to respond_to(:log_arguments?)
    end

    # production.rb は Rails.application.configure ブロックなので、テスト中に
    # 評価するとアプリ全体の設定を書き換えてしまう。そのため実行はせず、
    # 「コメントを除いた最後の代入が false か」を見る。
    # これで次の退行を検知できる:
    #   - 行ごとコメントアウトされた
    #   - 後から true で上書きされた
    #   - 行が消された
    it 'production.rb の最終的な設定が false になっている' do
      source = Rails.root.join('config/environments/production.rb').read

      # 行コメントを除去してから代入行だけを集める
      assignments = source
                    .lines
                    .map { |line| line.sub(/#.*\z/, '') }
                    .grep(/config\.active_job\.log_arguments\s*=/)

      expect(assignments).not_to(be_empty,
                                'production.rb に config.active_job.log_arguments の設定がありません')
      expect(assignments.last).to match(/=\s*false/)
    end
  end

  describe '実際のログ出力（動作ベース）' do
    let(:user) { create(:user) }
    let(:log_output) { StringIO.new }

    # ログ購読先を差し替えて出力を捕まえる。
    # log_arguments はグローバル設定なので、必ず元へ戻す。
    around do |example|
      original_logger = ActiveJob::Base.logger
      original_log_arguments = ActiveJob::Base.log_arguments

      captured_logger = ActiveSupport::Logger.new(log_output)
      captured_logger.level = Logger::DEBUG
      ActiveJob::Base.logger = captured_logger

      example.run
    ensure
      ActiveJob::Base.logger = original_logger
      ActiveJob::Base.log_arguments = original_log_arguments
    end

    context 'log_arguments = false（production と同じ設定）' do
      before { ActiveJob::Base.log_arguments = false }

      it 'enqueue ログにトークンが出ない' do
        UserMailer.password_reset(user, SYNTHETIC_JOB_MARKER).deliver_later

        expect(log_output.string).to include('Enqueued ActionMailer::MailDeliveryJob')
        expect(log_output.string).not_to include(SYNTHETIC_JOB_MARKER)
      end

      it 'perform（実行開始）ログにもトークンが出ない' do
        # test 環境の queue_adapter は :inline なので、enqueue で実行まで走る
        UserMailer.password_reset(user, SYNTHETIC_JOB_MARKER).deliver_later

        expect(log_output.string).to include('Performing ActionMailer::MailDeliveryJob')
        expect(log_output.string).not_to include(SYNTHETIC_JOB_MARKER)
      end

      it 'ジョブ名と Job ID は残る（調査に必要）' do
        UserMailer.password_reset(user, SYNTHETIC_JOB_MARKER).deliver_later

        expect(log_output.string).to include('ActionMailer::MailDeliveryJob')
        expect(log_output.string).to match(/Job ID: [0-9a-f-]+/)
      end
    end

    # 「この設定が無いと本当に漏れる」ことを示す対照実験。
    # これが失敗するようになったら、log_arguments 以外の仕組みで
    # 引数が隠れていることになるので、テストの前提を見直す合図になる。
    context 'log_arguments = true（設定を外した場合）' do
      before { ActiveJob::Base.log_arguments = true }

      it 'トークンがログに出てしまう（＝この設定が効いている証拠）' do
        UserMailer.password_reset(user, SYNTHETIC_JOB_MARKER).deliver_later

        expect(log_output.string).to include(SYNTHETIC_JOB_MARKER)
      end
    end
  end
end
