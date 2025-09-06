# このファイルは 'rails generate rspec:install' を実行した際に spec/ にコピーされます。
require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'
# production環境でのデータベース切り捨てを防止します。
abort("The Rails environment is running in production mode!") if Rails.env.production?
require 'rspec/rails'
# spec/support/ 以下のヘルパーファイルをすべて読み込みます。
Rails.root.glob('spec/support/**/*.rb').sort_by(&:to_s).each { |f| require f }

# テスト実行前に、未適用のマイグレーションがないかチェックし、あれば適用します。
# ActiveRecordを使用していない場合は、この行を削除できます。
begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end
RSpec.configure do |config|
  # ActiveRecordやフィクスチャを使用しない場合は、この行を削除してください。
  config.fixture_paths = [
    Rails.root.join('spec/fixtures')
  ]

  # この設定を `true` にすることで、各テストはデータベーストランザクション内で実行されます。
  # テスト終了後、トランザクションは自動的にロールバックされ、データベースは元の状態に戻ります。
  # これはRailsのテストにおける最も標準的で、高速かつ安定したデータクリーンアップ方法です。
  # これにより、DatabaseCleanerの複雑な設定は一切不要になります。
  config.use_transactional_fixtures = true

  # FactoryBot設定
  config.include FactoryBot::Syntax::Methods
  
  # 認証ヘルパー設定
  config.include AuthHelpers, type: :request

  # APIヘルパー設定
  config.include ApiHelpers, type: :request

  # ActiveRecordのサポートを完全に無効にする場合は、以下の行のコメントを解除してください。
  # config.use_active_record = false

  # RSpec Railsは、ファイルの場所に基づいてテストに異なる振る舞いを自動的にミックスインします。
  # 例えば、spec/controllers以下のスペックで `get` や `post` を呼び出せるようになります。
  # 
  # この振る舞いを無効にするには、以下の行を削除し、代わりにスペックに明示的に
  # typeをタグ付けしてください。例：
  # 
  #     RSpec.describe UsersController, type: :controller do
  #       # ...
  #     end
  # 
  # 利用可能なさまざまなタイプについては、RSpec Railsのドキュメントに記載されています。
  # https://rspec.info/features/6-0/rspec-rails
  config.infer_spec_type_from_file_location!

  # バックトレースからRails gemに由来する行をフィルタリングします。
  config.filter_rails_from_backtrace!
  # 任意のgemも同様にフィルタリングできます:
  # config.filter_gems_from_backtrace("gem name")
end

# Shoulda Matchers の設定
Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
