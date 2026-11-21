require 'rails_helper'

# 本番では config/initializers/structured_logging.rb が Rails.logger を JSON で出すロガーに差し替える。
# 2026-11-22 の本番ログでは、RAILS_LOG_LEVEL=info なのに "level":"DEBUG" の行が出て、
# SQL の本文とバインド値（user_id や dream_id の一覧）まで書かれていた。
# 差し替えたロガーが config.log_level を受け取らず、Logger の既定（DEBUG）のまま動いていたため。
# その回帰テスト。
#
# この初期化ファイルの中身は本番か STRUCTURED_LOGGING=true のときだけ動く。そこで
# STRUCTURED_LOGGING=true にして、テストの中で読み直す。読み直すと Rails.logger の差し替え・
# 通知の購読・定数の定義が起きるので、after ですべて元に戻す。
RSpec.describe 'structured_logging.rb が差し替えるロガーのレベル' do
  let(:initializer_path) { Rails.root.join('config/initializers/structured_logging.rb').to_s }
  let(:constants_defined_by_initializer) { %i[JsonFormatter StructuredLogger] }
  let(:subscribers) { [] }

  before do
    @original_logger = Rails.logger
    @original_log_level = Rails.application.config.log_level
    @constants_defined_before = constants_defined_by_initializer.select { |name| Object.const_defined?(name) }

    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('STRUCTURED_LOGGING').and_return('true')

    # 読み直しで増えた購読を after で外せるように控えておく
    allow(ActiveSupport::Notifications).to receive(:subscribe).and_wrap_original do |original, *args, &block|
      original.call(*args, &block).tap { |subscriber| subscribers << subscriber }
    end
  end

  after do
    subscribers.each { |subscriber| ActiveSupport::Notifications.unsubscribe(subscriber) }
    (constants_defined_by_initializer - @constants_defined_before).each do |name|
      Object.send(:remove_const, name) if Object.const_defined?(name)
    end
    Rails.logger = @original_logger
    Rails.application.config.log_level = @original_log_level
  end

  def load_initializer_with(log_level)
    Rails.application.config.log_level = log_level
    load initializer_path
  end

  it 'config.log_level が "info"（本番の RAILS_LOG_LEVEL=info）なら INFO になり、DEBUG の行を出さない' do
    load_initializer_with('info')

    expect(Rails.logger.level).to eq(Logger::INFO)
    expect(Rails.logger.debug?).to be(false)
  end

  it 'config.log_level の値に従う（INFO に決め打ちしていない）' do
    load_initializer_with(:warn)

    expect(Rails.logger.level).to eq(Logger::WARN)
  end

  it '差し替えたロガーは今までどおり JSON で出す' do
    load_initializer_with('info')

    expect(Rails.logger.formatter).to be_a(JsonFormatter)
  end
end
