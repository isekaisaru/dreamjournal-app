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

    # 例外メッセージで対応する範囲: 単一引用符の SQL 値・DETAIL 行・
    # 「型への変換に失敗した入力値」。それ以外の自由文は対象外。
    describe 'PostgreSQL の例外メッセージに入る値' do
      def filtered_value(message)
        event = error_event(error: ActiveRecord::StatementInvalid.new(message))
        before_send.call(event, {}).exception.values.first.value
      end

      it 'DETAIL 行のキーの値（Key (...)=(...)）を除く' do
        value = filtered_value(
          "PG::UniqueViolation: ERROR:  duplicate key value violates unique constraint \"index_users_on_email\"\n" \
          "DETAIL:  Key (email)=(#{search_word}@example.invalid) already exists.\n" \
          ': INSERT INTO "users" ("email") VALUES ($1) RETURNING "id"'
        )

        expect(value).not_to include(search_word)
        expect(value).to include('DETAIL:  [FILTERED]')
        expect(value).to include('"index_users_on_email"')
      end

      it 'DETAIL 行の行の中身（Failing row contains）を除く' do
        value = filtered_value(
          "PG::NotNullViolation: ERROR:  null value in column \"user_id\" of relation \"dreams\" violates not-null constraint\n" \
          "DETAIL:  Failing row contains (7, #{search_word}, null).\n" \
          ': INSERT INTO "dreams" ("title") VALUES ($1) RETURNING "id"'
        )

        expect(value).not_to include(search_word)
        expect(value).to include('relation "dreams"')
      end

      it '型への変換に失敗した入力値を除く' do
        value = filtered_value(
          "PG::InvalidTextRepresentation: ERROR:  invalid input syntax for type integer: \"#{search_word}\"\n" \
          'LINE 1: SELECT "dreams".* FROM "dreams" WHERE "dreams"."id" = $1'
        )

        expect(value).not_to include(search_word)
        expect(value).to include('for type integer: "[FILTERED]"')
      end
    end
  end

  # トークンの親パスをエンコードや区切りの重複で隠しても見落とさない。
  describe '再設定パスの表記ゆれ' do
    # TOKEN の位置に合成トークンを入れる。
    [
      ['エンコードした親パス名', '/%70assword_resets/TOKEN'],
      ['二重にエンコードした親パス名', '/%2570assword_resets/TOKEN'],
      ['大文字の親パス名', '/PASSWORD_RESETS/TOKEN'],
      ['空の区間をはさむ', '/password_resets//TOKEN'],
      ['エンコードした区切りをはさむ', '/password_resets/%2F/TOKEN'],
      ['親パスとトークンを1つの区間に押し込む', '/password_resets%2FTOKEN']
    ].each do |label, template|
      it "#{label}: URL とトランザクション名からトークンを除く" do
        path = template.sub('TOKEN', token)
        error = before_send.call(error_event(env: rack_env("https://api.example.invalid#{path}")), {})
        transaction = before_send_transaction.call(transaction_event(name: path), {})

        expect(error.request.url).not_to include(token)
        expect(transaction.transaction).not_to include(token)
      end
    end

    it '4重以上にエンコードされて判定できない区間とその次は送らない' do
      path = "/%25252570assword_resets/#{token}"

      transaction = before_send_transaction.call(transaction_event(name: path), {})

      expect(transaction.transaction).to eq('/[FILTERED]/[FILTERED]')
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
