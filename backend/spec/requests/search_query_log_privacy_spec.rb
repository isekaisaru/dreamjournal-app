require 'rails_helper'

# 夢の検索語（GET /dreams?query=...）は、夢の中身そのものに近い個人的な情報。
# 本番のログに残らないことを確かめる。
#
# 2026-11-23 時点で、検索語は次の経路からログに出ていた。
# 1. config/initializers/structured_logging.rb の「100ms を超えた SQL を INFO で出す」購読。
#    DreamFilterQuery は `where("title ILIKE :query ...", query: ...)` で検索語を SQL 文に
#    直接埋め込むので、SQL の本文に検索語が入る。本番は DB の1往復が 100ms を超えるので、ほぼ毎回出る。
# 2. Rails の「Started GET "/dreams?query=..."」の行と Parameters の行、
#    structured_logging.rb の controller_action の path。filter_parameters に query が無かった。
#    filtered_path は `;` やエンコードしたキー（q%75ery=...）では伏せきれないので、
#    クエリ文字列はまるごと出さないようにした。
RSpec.describe '夢の検索語をログに出さない', type: :request do
  # URL エンコードで形が変わらないよう、ASCII だけの語にする
  let(:secret_word) { 'yumetree-secret-search-word' }
  let!(:user) { create(:user, :with_self_profile) }

  describe '本番の構造化ログ（structured_logging.rb）' do
    let(:initializer_path) { Rails.root.join('config/initializers/structured_logging.rb').to_s }
    let(:constants_defined_by_initializer) { %i[JsonFormatter StructuredLogger] }
    let(:subscribers) { [] }
    let(:callbacks) { Hash.new { |hash, event| hash[event] = [] } }
    let(:log_output) { StringIO.new }

    before do
      @original_logger = Rails.logger
      @constants_defined_before = constants_defined_by_initializer.select { |name| Object.const_defined?(name) }

      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('STRUCTURED_LOGGING').and_return('true')

      # 読み直しで増えた購読を after で外し、購読の処理だけを直接呼べるように控える
      allow(ActiveSupport::Notifications).to receive(:subscribe).and_wrap_original do |original, *args, &block|
        callbacks[args.first] << block
        original.call(*args, &block).tap { |subscriber| subscribers << subscriber }
      end

      load initializer_path
      Rails.logger = Logger.new(log_output).tap { |logger| logger.formatter = JsonFormatter.new }
    end

    after do
      subscribers.each { |subscriber| ActiveSupport::Notifications.unsubscribe(subscriber) }
      (constants_defined_by_initializer - @constants_defined_before).each do |name|
        Object.send(:remove_const, name) if Object.const_defined?(name)
      end
      Rails.logger = @original_logger
    end

    # 200ms かかったことにして、初期化ファイルの購読へ直接渡す
    def notify(event, payload)
      started = Time.current
      expect(callbacks[event]).not_to be_empty
      callbacks[event].each { |callback| callback.call(event, started, started + 0.2, 'test-id', payload) }
    end

    it '遅い SQL のログは、検索語を SQL の本文から消して出す（どの SQL かは分かるように残す）' do
      sql = DreamFilterQuery.new(user.dreams, { query: secret_word }).call.to_sql
      expect(sql).to include(secret_word) # 前提: 検索語は SQL 文に埋め込まれている

      notify('sql.active_record', { sql: sql, name: 'Dream Load' })

      expect(log_output.string).to include('"operation":"database_query"')
      expect(log_output.string).to include('ILIKE')
      expect(log_output.string).to include('[FILTERED]')
      expect(log_output.string).not_to include(secret_word)
    end

    it 'controller_action のログは、path からクエリ文字列を外して出す（filtered_path で伏せきれない ; の形でも）' do
      notify('process_action.action_controller', {
        controller: 'DreamsController', action: 'index', method: 'GET',
        # Rails の filtered_path は `;` の後ろを伏せない（`query=[FILTERED];<検索語>` になる）
        path: "/dreams?query=[FILTERED];#{secret_word}",
        status: 200, headers: { 'HTTP_USER_AGENT' => 'rspec', 'REMOTE_ADDR' => '192.0.2.1' }
      })

      expect(log_output.string).to include('"operation":"controller_action"')
      expect(log_output.string).to include('"path":"/dreams"')
      expect(log_output.string).not_to include(secret_word)
    end
  end

  describe 'Rails のリクエストのログ（Started の行と Parameters の行）' do
    let(:log_output) { StringIO.new }
    let(:payloads) { [] }

    # ログの出力先を差し替えて GET し、process_action の計測データも控える
    def get_with_captured_logs(path, headers)
      on_process_action = ->(_name, _started, _finished, _id, payload) { payloads << payload }
      original_logger = Rails.logger
      original_controller_logger = ActionController::Base.logger

      captured_logger = ActiveSupport::Logger.new(log_output)
      Rails.logger = captured_logger
      # ActionController::Base は起動時に Rails.logger を控えているので、Parameters の行を
      # 拾うにはこちらも差し替える（spec/config/dream_body_logging_spec.rb と同じやり方）
      ActionController::Base.logger = captured_logger
      ActiveSupport::Notifications.subscribed(on_process_action, 'process_action.action_controller') do
        get path, headers: headers
      end
    ensure
      Rails.logger = original_logger
      ActionController::Base.logger = original_controller_logger
    end

    def expect_secret_word_not_logged
      expect(log_output.string).to include('Started GET "/dreams"')
      expect(log_output.string).to include('Parameters:')
      expect(log_output.string).not_to include(secret_word)
      expect(payloads.last[:params].to_s).not_to include(secret_word)
    end

    # 前提: どの書き方でも、Rails は検索語として受け取って検索に使っている
    def expect_searched_by_secret_word(found)
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body).map { |dream| dream['id'] }).to eq([found.id])
    end

    let!(:found) { create(:dream, user: user, title: "x#{secret_word}x の夢") }
    let!(:not_found) { create(:dream, user: user, title: 'ふつうの夢') }

    it 'GET /dreams?query=... の検索語を出さない' do
      get_with_captured_logs("/dreams?query=#{secret_word}", auth_headers(user))

      expect_searched_by_secret_word(found)
      expect_secret_word_not_logged
    end

    it 'キーを URL エンコードした形（q%75ery=...）でも出さない' do
      get_with_captured_logs("/dreams?q%75ery=#{secret_word}", auth_headers(user))

      expect_searched_by_secret_word(found)
      expect_secret_word_not_logged
    end

    it '値に ; を含む形（query=x;...）でも出さない' do
      get_with_captured_logs("/dreams?query=x;#{secret_word}", auth_headers(user))

      expect(response).to have_http_status(:ok)
      expect_secret_word_not_logged
    end

    # Started の行はルーティングより前に出るので、どんなパスでも届きうる。
    # パスに \& があっても、置き換えの後方参照でクエリ文字列が戻らないことを確かめる。
    it 'パスに \& を含んでも、Started の行にクエリ文字列を戻さない' do
      env = Rack::MockRequest.env_for('/')
      env['PATH_INFO'] = '/dreams/\&'
      env['QUERY_STRING'] = "q%75ery=#{secret_word}"
      request = ActionDispatch::Request.new(Rails.application.env_config.merge(env))

      message = Rails::Rack::Logger.new(->(_env) { [200, {}, []] }).send(:started_request_message, request)

      expect(message).to start_with('Started GET "/dreams/\&" for ')
      expect(message).not_to include(secret_word)
    end
  end
end
