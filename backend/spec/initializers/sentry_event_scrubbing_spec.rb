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

    it 'SQL 以外の例外メッセージは変えない' do
      event = error_event(error: ArgumentError.new("invalid status: 'pending'"))

      expect(before_send.call(event, {}).exception.values.first.value).to include("'pending'")
    end

    it '除去に失敗したらイベントを送らせない（nil を返す）' do
      event = error_event(env: reset_env)
      allow(event.request).to receive(:url=).and_raise(RuntimeError, '想定外エラー')

      expect(before_send.call(event, {})).to be_nil
    end

    # PostgreSQL のエラー文は、入力値をいろいろな書き方で埋め込む（"..."・DETAIL・SQL の文字列など）。
    # 書き方ごとに消す方式では漏れが残るので、ActiveRecord:: と PG:: の例外は本文を送らない。
    # 例外の種類と、起きた場所（スタックトレース）は残す。
    describe 'データベースの例外' do
      # WORD の位置に合成マーカーを入れる。
      [
        ['SQL の文字列', "PG::QueryCanceled: ERROR:  canceling statement\n: SELECT \"dreams\".* FROM \"dreams\" WHERE (title ILIKE '%WORD%')"],
        ['DETAIL のキーの値', "PG::UniqueViolation: ERROR:  duplicate key value violates unique constraint \"index_users_on_email\"\nDETAIL:  Key (email)=(WORD@example.invalid) already exists."],
        ['改行を含む DETAIL', "PG::NotNullViolation: ERROR:  null value in column \"user_id\"\nDETAIL:  Failing row contains (7, first-line\nWORD, null)."],
        ['型への変換に失敗した入力値', "PG::InvalidTextRepresentation: ERROR:  invalid input syntax for type integer: \"WORD\""],
        ['日時の範囲外の入力値', "PG::DatetimeFieldOverflow: ERROR:  date/time field value out of range: \"WORD\""],
        ['ドル記号で囲んだ文字列', "PG::SyntaxError: ERROR:  syntax error at or near \"x\"\nLINE 1: SELECT $$WORD$$ x"]
      ].each do |label, template|
        it "#{label}: 本文を送らず、例外の種類と場所は残す" do
          event = error_event(error: ActiveRecord::StatementInvalid.new(template.gsub('WORD', search_word)))

          exception = before_send.call(event, {}).exception.values.first

          expect(exception.value).to eq('[FILTERED]')
          expect(exception.type).to eq('ActiveRecord::StatementInvalid')
          expect(exception.stacktrace).to be_present
        end
      end

      it 'PG の例外そのもの（ActiveRecord が包んだ元の例外）も本文を送らない' do
        error = begin
          begin
            raise PG::UniqueViolation, "ERROR:  duplicate key value\nDETAIL:  Key (email)=(#{search_word}) already exists."
          rescue PG::UniqueViolation => e
            raise ActiveRecord::RecordNotUnique, e.message
          end
        rescue ActiveRecord::RecordNotUnique => e
          e
        end
        event = Sentry::ErrorEvent.new(configuration: Sentry.configuration)
        event.add_exception_interface(error, mechanism: Sentry::Mechanism.new)

        filtered = before_send.call(event, {})

        expect(filtered.exception.values.map(&:type)).to contain_exactly('PG::UniqueViolation', 'ActiveRecord::RecordNotUnique')
        expect(filtered.exception.values.map(&:value)).to all(eq('[FILTERED]'))
        expect(filtered.to_json_compatible.to_s).not_to include(search_word)
      end

      it '不正なバイト列を含むメッセージでも本文を送らない' do
        message = ("PG::SyntaxError: ERROR:  syntax error\nLINE 1: SELECT '#{search_word}' ".b + "\xFF".b)
                  .force_encoding(Encoding::UTF_8)

        result = before_send.call(error_event(error: ActiveRecord::StatementInvalid.new(message)), {})

        expect(result.exception.values.first.value).to eq('[FILTERED]')
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
      ],
      # PostgreSQL のドル引用符。バインド変数（$1）は文字列ではないので残す。
      [
        %q(SELECT 1 WHERE title = $$it's WORD$$ LIMIT $1),
        %q(SELECT 1 WHERE title = '[FILTERED]' LIMIT $1)
      ],
      [
        %q(SELECT 1 WHERE title = $q$WORD$$ still WORD$q$ AND id = 7),
        %q(SELECT 1 WHERE title = '[FILTERED]' AND id = 7)
      ],
      [
        %q(SELECT 1 WHERE title = $$WORD),
        %q(SELECT 1 WHERE title = '[FILTERED]')
      ],
      # E'...' はバックスラッシュで引用符をエスケープできる。
      [
        %q(SELECT 1 WHERE title = E'it\'s WORD' AND id = 7),
        %q(SELECT 1 WHERE title = '[FILTERED]' AND id = 7)
      ],
      # 末尾の \ で切れた E'...' も末尾まで除く。
      [
        "SELECT E'abc\\'WORD\\",
        "SELECT '[FILTERED]'"
      ],
      # ドル引用符のタグには非 ASCII の文字も使える。
      [
        %q(SELECT $日本語$private WORD text$日本語$ AND id = 7),
        %q(SELECT '[FILTERED]' AND id = 7)
      ],
      # "..." は識別子なので、中の ' で文字列が始まったと扱わない。
      [
        %q(SELECT "a'b", 'WORD' FROM dreams),
        %q(SELECT "a'b", '[FILTERED]' FROM dreams)
      ],
      # 識別子の中の $$ はドル引用符ではない。
      [
        %q(SELECT some$$column, id FROM dreams),
        %q(SELECT some$$column, id FROM dreams)
      ],
      # 閉じていない "..." の後ろは区切りを判定できないので末尾まで除く。
      [
        %q(SELECT "abc, 'WORD' FROM dreams),
        %q(SELECT [FILTERED])
      ],
      # コメントは中身ごと除く。中の " や ' で読み間違えない。
      [
        %q(SELECT /* " */ 'WORD' AS "x"),
        %q(SELECT /*[FILTERED]*/ '[FILTERED]' AS "x")
      ],
      [
        "SELECT 1 -- \"\nWHERE title = 'WORD'",
        "SELECT 1 --[FILTERED]\nWHERE title = '[FILTERED]'"
      ],
      # /* */ は入れ子にできる。外側の */ までをコメントとして読む。
      [
        %q(SELECT /* outer /* inner */ " */ 'WORD' AS "x"),
        %q(SELECT /*[FILTERED]*/ '[FILTERED]' AS "x")
      ],
      [
        %q(SELECT /* outer /* inner */ WORD */ 1),
        %q(SELECT /*[FILTERED]*/ 1)
      ],
      [
        %q(SELECT 1 /* WORD),
        %q(SELECT 1 /*[FILTERED]*/)
      ],
      # タグには ASCII 以外の文字（記号・絵文字を含む）をすべて使える。
      [
        %q(SELECT $€$private WORD$€$ AND id = 7),
        %q(SELECT '[FILTERED]' AND id = 7)
      ],
      [
        "SELECT $\u{1F319}$WORD$\u{1F319}$",
        "SELECT '[FILTERED]'"
      ]
    ].each do |sql, expected|
      it "SQL スパンの文字列値を除く: #{expected}" do
        event = transaction_event(spans: [['db.sql.active_record', sql]])

        spans = before_send_transaction.call(event, {}).spans

        expect(spans.first[:description]).to eq(expected)
      end
    end

    it '不正なバイト列を含む SQL でも検索語を送らない' do
      sql = ("SELECT 1 WHERE title = '#{search_word}' ".b + "\xFF".b).force_encoding(Encoding::UTF_8)

      result = before_send_transaction.call(transaction_event(spans: [['db.sql.active_record', sql]]), {})

      expect(result&.spans&.first&.dig(:description).to_s.b).not_to include(search_word)
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
