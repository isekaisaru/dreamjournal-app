require 'rails_helper'

# Sentry へ送るイベントに、パスワード再設定トークンと検索語が混ざらないことを守る回帰テスト。
#
# 実際の Sentry::ErrorEvent / Sentry::TransactionEvent と、
# config/initializers/sentry.rb で登録された before_send / before_send_transaction を使う。
# フィルタを外したり登録を消したりすれば落ちる。
RSpec.describe 'Sentry 送信前のトークン・検索語の除去' do
  # 本物のトークンや検索語は使わない。混入検知用の合成マーカー。
  let(:token) { 'SYNTHETIC_RESET_TOKEN_Zx81QpLm44aa90bb' }
  let(:search_word) { 'SYNTHETIC_DREAM_SEARCH_WORD' }

  let(:before_send) { Sentry.configuration.before_send }
  let(:before_send_transaction) { Sentry.configuration.before_send_transaction }

  def rack_env(url, referer: nil)
    options = { method: 'PATCH' }
    options['HTTP_REFERER'] = referer if referer
    Rack::MockRequest.env_for(url, options)
  end

  def raised(error)
    raise error
  rescue StandardError => e
    e
  end

  def error_event(error: RuntimeError.new('boom'), env: nil)
    event = Sentry::ErrorEvent.new(configuration: Sentry.configuration)
    event.add_exception_interface(raised(error), mechanism: Sentry::Mechanism.new)
    event.rack_env = env if env
    event
  end

  def transaction_event(name: 'PasswordResetsController#update', env: nil, spans: [])
    transaction = Sentry::Transaction.new(
      name: name,
      source: :url,
      op: 'http.server',
      sampled: true,
      timestamp: Sentry.utc_now.to_f
    )
    spans.each do |op, description|
      transaction.start_child(op: op, description: description).finish
    end

    event = Sentry::TransactionEvent.new(configuration: Sentry.configuration, transaction: transaction)
    event.rack_env = env if env
    event
  end

  def reset_env
    rack_env(
      "https://api.example.invalid/password_resets/#{token}",
      referer: "https://app.example.invalid/password-reset/#{token}"
    )
  end

  shared_examples 'リクエスト情報からトークンを除く' do
    it 'シリアライズ結果にトークンが残らない' do
      expect(filtered.to_json_compatible.to_s).not_to include(token)
    end

    it 'URL の置き換えはトークンの部分だけに留める' do
      expect(filtered.request.url).to eq('https://api.example.invalid/password_resets/[FILTERED]')
    end

    it 'Referer を送らない' do
      expect(filtered.request.headers).not_to have_key('Referer')
    end
  end

  describe 'エラーイベント' do
    context '再設定 URL へのリクエスト' do
      let(:filtered) { before_send.call(error_event(env: reset_env), {}) }

      include_examples 'リクエスト情報からトークンを除く'

      it 'ErrorEvent を返す（通知は届く）' do
        expect(filtered).to be_a(Sentry::ErrorEvent)
      end
    end

    it '再設定以外の URL は変えない' do
      event = error_event(env: rack_env('https://api.example.invalid/dreams/42'))

      expect(before_send.call(event, {}).request.url).to eq('https://api.example.invalid/dreams/42')
    end

    it 'SQL の例外メッセージから検索語を除き、テーブル名は残す' do
      message = "PG::QueryCanceled: ERROR:  canceling statement\n" \
                ": SELECT \"dreams\".* FROM \"dreams\" WHERE (title ILIKE '%#{search_word}%')"
      event = error_event(error: ActiveRecord::StatementInvalid.new(message))

      value = before_send.call(event, {}).exception.values.first.value

      expect(value).not_to include(search_word)
      expect(value).to include('FROM "dreams"')
    end

    it 'SQL 以外の例外メッセージは変えない' do
      event = error_event(error: ArgumentError.new("invalid status: 'pending'"))

      expect(before_send.call(event, {}).exception.values.first.value).to include("'pending'")
    end

    it '除去に失敗したらイベントを送らせない（nil を返す）' do
      event = error_event(env: reset_env)
      allow(event.request).to receive(:url=).and_raise(RuntimeError, '想定外エラー')

      expect(before_send.call(event, {})).to be_nil
    end
  end

  describe 'トランザクションイベント' do
    context '再設定 URL へのリクエスト' do
      let(:filtered) { before_send_transaction.call(transaction_event(env: reset_env), {}) }

      include_examples 'リクエスト情報からトークンを除く'

      it 'TransactionEvent を返す（計測は止めない）' do
        expect(filtered).to be_a(Sentry::TransactionEvent)
      end
    end

    it 'コントローラ確定前のパス名からトークンを除く' do
      event = transaction_event(name: "/password_resets/#{token}")

      expect(before_send_transaction.call(event, {}).transaction).to eq('/password_resets/[FILTERED]')
    end

    it 'コントローラ名のトランザクション名は変えない' do
      event = transaction_event(name: 'DreamsController#index')

      expect(before_send_transaction.call(event, {}).transaction).to eq('DreamsController#index')
    end

    # [SQL, 除去後に期待する SQL] は手で書いた期待値。
    [
      [
        %q(SELECT "dreams".* FROM "dreams" WHERE (title ILIKE '%WORD%' OR content ILIKE '%WORD%') LIMIT $1),
        %q(SELECT "dreams".* FROM "dreams" WHERE (title ILIKE '[FILTERED]' OR content ILIKE '[FILTERED]') LIMIT $1)
      ],
      [
        %q(SELECT 1 WHERE title ILIKE '%it''s WORD%' AND id = 7),
        %q(SELECT 1 WHERE title ILIKE '[FILTERED]' AND id = 7)
      ],
      [
        %q(SELECT 1 WHERE title ILIKE '%WORD),
        %q(SELECT 1 WHERE title ILIKE '[FILTERED]')
      ]
    ].each do |sql, expected|
      it "SQL スパンの文字列値を除く: #{expected}" do
        event = transaction_event(spans: [['db.sql.active_record', sql]])

        spans = before_send_transaction.call(event, {}).spans

        expect(spans.first[:description]).to eq(expected)
      end
    end

    it 'SQL 以外のスパンの説明は変えない' do
      description = "render 'dreams/index'"
      event = transaction_event(spans: [['template.render_template.action_view', description]])

      expect(before_send_transaction.call(event, {}).spans.first[:description]).to eq(description)
    end

    it '除去に失敗したらイベントを送らせない（nil を返す）' do
      event = transaction_event(env: reset_env)
      allow(event.request).to receive(:url=).and_raise(RuntimeError, '想定外エラー')

      expect(before_send_transaction.call(event, {})).to be_nil
    end
  end
end
