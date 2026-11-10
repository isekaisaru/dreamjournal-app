# Sentry へ送るイベントから、再設定トークンと SQL 内の文字列値を取り除く。
#
# 【なぜ必要か】send_default_pii が false でも、次の情報は送られる。
# - request.url のパス: PATCH /password_resets/<生トークン>
# - Referer ヘッダー: /password-reset/<生トークン> の画面から来たリクエスト
# - トランザクション名: コントローラ確定前は生のパスのまま
# - SQL スパンの説明: `where("title ILIKE :query", query: ...)` は値を SQL 文に
#   埋め込むので、夢の検索語がそのまま入る（例外メッセージの SQL も同様）
#
# トランザクションには before_send が効かない（sentry-ruby 6.6.2 client.rb:243, 256）ので、
# before_send と before_send_transaction の両方から呼ぶ。
module SentryEventScrubber
  REDACTED = '[FILTERED]'

  RESET_TOKEN_PATH = %r{(/password_resets/)[^/?#]+}
  # 閉じていない文字列（長さの上限で切られたメッセージなど）も末尾まで除く。
  SQL_STRING_LITERAL = /'(?:[^']|'')*(?:'|\z)/
  SQL_SPAN_OP = 'db.sql.active_record'
  SQL_EXCEPTION_PREFIXES = %w[ActiveRecord:: PG::].freeze

  # 正常時は event を返す。失敗したときは未処理のイベントを送らないよう nil を返す
  # （sentry-ruby は戻り値がイベントでなければ送信せずに捨てる）。
  def self.call(event)
    scrub_request(event.request)
    event.transaction = scrub_path(event.transaction) if event.transaction
    scrub_spans(event) if event.is_a?(Sentry::TransactionEvent)
    scrub_exceptions(event) if event.is_a?(Sentry::ErrorEvent)
    event
  rescue StandardError
    # ここで event の中身をログに出すと本末転倒なので、何も出力しない。
    nil
  end

  def self.scrub_request(request)
    return unless request

    request.url = scrub_path(request.url) if request.url
    request.headers&.delete('Referer')
  end
  private_class_method :scrub_request

  def self.scrub_spans(event)
    event.spans&.each do |span|
      next unless span[:op] == SQL_SPAN_OP && span[:description]

      span[:description] = scrub_sql(span[:description])
    end
  end
  private_class_method :scrub_spans

  def self.scrub_exceptions(event)
    event.exception&.values&.each do |exception|
      next unless exception.value && SQL_EXCEPTION_PREFIXES.any? { |prefix| exception.type.start_with?(prefix) }

      exception.value = scrub_sql(exception.value)
    end
  end
  private_class_method :scrub_exceptions

  def self.scrub_path(text)
    text.gsub(RESET_TOKEN_PATH) { "#{Regexp.last_match(1)}#{REDACTED}" }
  end
  private_class_method :scrub_path

  def self.scrub_sql(text)
    text.gsub(SQL_STRING_LITERAL) { "'#{REDACTED}'" }
  end
  private_class_method :scrub_sql
end
