require 'rails_helper'

# Issue #561: 2つのDB接続で、実際に処理の途中へ割り込ませる。
# トランザクション方式のテストでは接続がスレッド間で共有され並行にならないため無効にし、
# 作成したデータは after で削除する。
RSpec.describe 'PUT /dreams/:id の書き込み順の逆転', type: :request do
  self.use_transactional_tests = false

  ORIGIN = 'http://localhost:3000'.freeze
  WAIT_SECONDS = 15

  let!(:user) { create(:user, :with_self_profile) }
  let!(:dream) { create(:dream, user: user, title: '元のタイトル', content: '元の内容') }
  let(:headers) { auth_headers(user) }
  let(:path) { "/dreams/#{dream.id}" }
  let(:reached) { Concurrent::CountDownLatch.new(1) }
  let(:release) { Concurrent::CountDownLatch.new(1) }

  before do
    database = ActiveRecord::Base.connection.current_database
    raise "テスト用DB以外では実行しない: #{database}" unless Rails.env.test? && database.match?(/test/)
  end

  after do
    release.count_down
    user.destroy!
  end

  def edit_body(title, content, version)
    { dream: { title: title, content: content }, expected_edit_version: version }.to_json
  end

  def request_headers
    headers.merge('Content-Type' => 'application/json', 'Origin' => ORIGIN)
  end

  def fetched_version
    get path, headers: headers
    JSON.parse(response.body)['edit_version']
  end

  # 自分のスレッドで sql_pattern に一致するSQLが完了した直後に一度だけ止まる。
  # 通知は発行元のスレッドで同期実行されるため、本番コードに差し込み口は要らない。
  def pause_after_sql(sql_pattern)
    fired = false
    subscription = ActiveSupport::Notifications.subscribe('sql.active_record') do |*, payload|
      next unless Thread.current[:pause_here] && !fired && payload[:sql].match?(sql_pattern)

      fired = true
      reached.count_down
      ActiveSupport::Dependencies.interlock.permit_concurrent_loads do
        raise '解放待ちがタイムアウトしました' unless release.wait(WAIT_SECONDS)
      end
    end
    yield
  ensure
    ActiveSupport::Notifications.unsubscribe(subscription)
  end

  def put_in_thread(body, pause: false)
    request_headers_for_thread = request_headers
    target = path
    Thread.new do
      Thread.current[:pause_here] = pause
      session = ActionDispatch::Integration::Session.new(Rails.application)
      session.put(target, params: body, headers: request_headers_for_thread)
      session.response.status
    end
  end

  def wait_until_blocked_on_row_lock
    deadline = Process.clock_gettime(Process::CLOCK_MONOTONIC) + WAIT_SECONDS
    loop do
      blocked = ActiveRecord::Base.connection.select_value(<<~SQL)
        SELECT count(*) FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE '%FOR UPDATE%'
      SQL
      return if blocked.to_i.positive?
      raise '行ロック待ちになりませんでした' if Process.clock_gettime(Process::CLOCK_MONOTONIC) > deadline

      sleep 0.02
    end
  end

  it '読み込み済みのPUT①が、後から確定したPUT②の内容を上書きしない' do
    version = fetched_version
    current_headers = request_headers

    pause_after_sql(/\ASELECT "dreams"\.\* FROM "dreams" WHERE "dreams"\."id" = (?!.*FOR UPDATE)/) do
      old_put = put_in_thread(edit_body('旧', '古い内容', version), pause: true)
      expect(reached.wait(WAIT_SECONDS)).to be(true), 'PUT①が読み込みまで進みませんでした'

      put path, params: edit_body('新', '新しい内容', version), headers: current_headers
      expect(response).to have_http_status(:ok)

      release.count_down
      expect(old_put.join(WAIT_SECONDS)).not_to be_nil, 'PUT①が完了しませんでした'
      expect(old_put.value).to eq(409)
    end

    expect(dream.reload).to have_attributes(title: '新', content: '新しい内容')
  end

  it '行ロックを持つPUTの確定を待ち、後のPUTは409になる' do
    version = fetched_version

    pause_after_sql(/FROM "dreams".*FOR UPDATE/) do
      first_put = put_in_thread(edit_body('先', '先に確定する内容', version), pause: true)
      expect(reached.wait(WAIT_SECONDS)).to be(true), '先のPUTが行ロックまで進みませんでした'

      second_put = put_in_thread(edit_body('後', '後から届いた内容', version))
      wait_until_blocked_on_row_lock

      release.count_down
      expect(first_put.join(WAIT_SECONDS)).not_to be_nil, '先のPUTが完了しませんでした'
      expect(second_put.join(WAIT_SECONDS)).not_to be_nil, '後のPUTが完了しませんでした'
      expect(first_put.value).to eq(200)
      expect(second_put.value).to eq(409)
    end

    expect(dream.reload).to have_attributes(title: '先', content: '先に確定する内容', edit_version: version + 1)
  end
end
