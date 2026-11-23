# Rails が毎リクエスト出す「Started GET "/dreams?query=..." for ...」の行に、URL のクエリ文字列を出さない。
#
# Rails 8.1.4.1 の Rails::Rack::Logger#started_request_message は request.filtered_path を使う。
# filtered_path は filter_parameters で値を伏せるが、`;` で区切った `=` のない部分や
# デコード前のキーで照合するなど、Rails のクエリの読み方と食い違う場面があり、
# 夢の検索語（GET /dreams?query=...）がそのまま残ることがある（2026-11-23）。
# 調査に要るのはメソッドとパスなので、クエリ文字列はまるごと出さない。
#
# Rails 側のメソッド名が変わるとこの上書きは効かなくなるが、
# spec/requests/search_query_log_privacy_spec.rb が Started の行を確かめるので、そこで気づける。
module StartedRequestLogWithoutQuery
  private

  # 置き換え後の文字列はブロックで返す。文字列で渡すと、パスに含まれる `\&` や `\0` などが
  # 後方参照として解釈され、外したはずのクエリ文字列が戻ってしまうため。
  def started_request_message(request)
    path = request.path
    super.sub(%("#{request.filtered_path}")) { %("#{path}") }
  end
end

Rails::Rack::Logger.prepend(StartedRequestLogWithoutQuery)
