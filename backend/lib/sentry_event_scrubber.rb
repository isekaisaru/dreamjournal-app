# Sentry へ送るイベントから、再設定トークンと SQL 内の値を取り除く。
#
# 【なぜ必要か】send_default_pii が false でも、次の情報は送られる。
# - request.url のパス: PATCH /password_resets/<生トークン>
# - Referer ヘッダー: /password-reset/<生トークン> の画面から来たリクエスト
# - トランザクション名: コントローラ確定前は生のパスのまま
# - SQL スパンの説明: `where("title ILIKE :query", query: ...)` は値を SQL 文に
#   埋め込むので、夢の検索語がそのまま入る
# - ActiveRecord / PostgreSQL の例外メッセージ: 後ろに付く SQL のほか、DETAIL（Key (email)=(...)）や
#   エラー文そのもの（date/time field value out of range: "..."）に入力値が入る。書き方がエラーごとに
#   違い、パターンで消すと漏れが残るので、本文は送らない（例外の種類とスタックトレースは残す）
#
# トランザクションには before_send が効かない（sentry-ruby 6.6.2 client.rb:243, 256）ので、
# before_send と before_send_transaction の両方から呼ぶ。
require 'strscan'

module SentryEventScrubber
  REDACTED = '[FILTERED]'

  # トークンが直後の区間に入るパス名。照合はデコード・小文字化した値で行う。
  TOKEN_PARENT_SEGMENTS = %w[
    password-reset password_reset password-resets password_resets reset-password
    verify-email verify_email email-verification email_verification
  ].to_set.freeze
  # %XX のうち ASCII のものだけを戻す。上限まで戻しても残る(4重以上)ものは判定できない。
  ASCII_ESCAPE = /%([0-7][0-9A-Fa-f])/
  MAX_DECODE_ROUNDS = 3

  # SQL の字句（scrub_sql_strings で先頭から順に読む）。
  # 識別子の中の $ や "..." の中の ' を文字列の始まりと取り違えないよう、正規表現1つで探さず左から読む。
  # 識別子とドル引用符のタグに使える文字は PostgreSQL の字句規則（scan.l の ident_start / dolq_start）
  # に合わせ、ASCII の英字・_ に加えて非 ASCII の文字をすべて含める。
  SQL_IDENT_START = '(?:[A-Za-z_]|[^\x00-\x7F])'
  # コメントは中身ごと除く（中の " や ' を数えない）。/* */ は入れ子にできるので深さを数える。
  SQL_LINE_COMMENT = /--[^\n]*/
  SQL_BLOCK_COMMENT_OPEN = %r{/\*}
  SQL_BLOCK_COMMENT_PART = %r{/\*|\*/|[^/*]+|[/*]}
  SQL_QUOTED_IDENTIFIER = /"(?:[^"]|"")*"/m                       # "a'b" は識別子なので残す
  SQL_WORD = /#{SQL_IDENT_START}(?:[A-Za-z0-9_$]|[^\x00-\x7F])*/ # some$$column も1つの識別子
  SQL_E_STRING = /[Ee]'(?:[^'\\]|\\(?:.|\z)|'')*(?:'|\z)/m        # E'...'（\ でエスケープ。末尾の \ だけでも末尾まで）
  SQL_DOLLAR_OPEN = /\$(?:#{SQL_IDENT_START}(?:[A-Za-z0-9_]|[^\x00-\x7F])*)?\$/ # $$ と $tag$。$1 は対象外
  SQL_PLAIN_STRING = /'(?:[^']|'')*(?:'|\z)/m                    # '...'（'' でエスケープ）
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

      span[:description] = scrub_sql_strings(span[:description])
    end
  end
  private_class_method :scrub_spans

  # ActiveRecord が包んだ元の PG 例外（cause）も values に入るので、すべて見る。
  def self.scrub_exceptions(event)
    event.exception&.values&.each do |exception|
      next unless exception.value && SQL_EXCEPTION_PREFIXES.any? { |prefix| exception.type.start_with?(prefix) }

      exception.value = REDACTED
    end
  end
  private_class_method :scrub_exceptions

  # `/` で区切った区間ごとに見て、親パス名の直後の区間を置き換える。
  # - `%70assword_resets` のようなエンコードや大文字でも、デコード・小文字化して照合する
  # - 空の区間（`//`）や区切りだけの区間（`%2F`）では判定を解除しない
  # - 親パス名とトークンが1つの区間に押し込まれた形（`password_resets%2F<token>`）も置き換える
  # - 4重以上にエンコードされて判定できない区間は、その区間と直後を置き換える
  def self.scrub_path(text)
    after_parent = false
    text.split('/', -1).map do |segment|
      next segment if segment.empty?

      names, undecidable = comparable_names(segment)
      hides_token = names[0...-1].any? { |name| TOKEN_PARENT_SEGMENTS.include?(name) }
      last_name = names.reject(&:empty?).last.to_s
      result = (after_parent || hides_token || undecidable) ? REDACTED : segment
      after_parent = undecidable ||
                     TOKEN_PARENT_SEGMENTS.include?(last_name) ||
                     (last_name.empty? && after_parent)
      result
    end.join('/')
  end
  private_class_method :scrub_path

  # 照合専用。出力には使わない。`;` 以降（パスパラメータ）は名前から外す。
  def self.comparable_names(segment)
    current = segment
    MAX_DECODE_ROUNDS.times do
      break unless current.match?(ASCII_ESCAPE)

      current = current.gsub(ASCII_ESCAPE) { Regexp.last_match(1).hex.chr }
    end
    names = current.downcase.split(%r{[/\\]}, -1).map { |part| part.split(';').first.to_s }
    [names, current.match?(ASCII_ESCAPE)]
  end
  private_class_method :comparable_names

  # SQL の文字列値を '[FILTERED]' に置き換える。閉じていない文字列は末尾まで除く。
  # 閉じていない "..." は、その後ろの区切りを判定できないので、末尾まで除く。
  def self.scrub_sql_strings(text)
    scanner = StringScanner.new(text)
    out = +''
    until scanner.eos?
      if scanner.skip(SQL_LINE_COMMENT)
        out << "--#{REDACTED}"
      elsif scanner.skip(SQL_BLOCK_COMMENT_OPEN)
        skip_block_comment(scanner)
        out << "/*#{REDACTED}*/"
      elsif scanner.check(/"/)
        quoted = scanner.scan(SQL_QUOTED_IDENTIFIER)
        return out << REDACTED unless quoted

        out << quoted
      elsif scanner.scan(SQL_E_STRING) || scanner.scan(SQL_PLAIN_STRING)
        out << "'#{REDACTED}'"
      elsif (word = scanner.scan(SQL_WORD))
        out << word
      elsif (delimiter = scanner.scan(SQL_DOLLAR_OPEN))
        scanner.skip_until(/#{Regexp.escape(delimiter)}/) || scanner.terminate
        out << "'#{REDACTED}'"
      else
        out << scanner.getch
      end
    end
    out
  end
  private_class_method :scrub_sql_strings

  # `/*` を読んだ直後から、対応する `*/` まで（閉じていなければ末尾まで）読み飛ばす。
  def self.skip_block_comment(scanner)
    depth = 1
    while depth.positive? && (part = scanner.scan(SQL_BLOCK_COMMENT_PART))
      depth += 1 if part == '/*'
      depth -= 1 if part == '*/'
    end
  end
  private_class_method :skip_block_comment
end
