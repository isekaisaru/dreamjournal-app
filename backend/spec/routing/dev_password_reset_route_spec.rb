# frozen_string_literal: true

require 'rails_helper'

# GET /dev/password_resets/token（開発・E2E専用）は、routes.rb が「起動時」に
# 登録の有無を決める。本番で環境変数 ENABLE_DEV_ENDPOINTS=true が誤って設定されても、
# ルートが存在しない（=404になる）ことを固定するテスト。
#
# 設計メモ（他のテストへ影響させないため）:
#   - Rails.application.routes は触らない（reload_routes! しない）。
#   - routes.rb の中身を、使い捨ての RouteSet に描画して調べる。
#   - Rails.env / ENV の差し替えは rspec-mocks の allow で行い、各example終了時に自動で元へ戻る。
RSpec.describe 'dev password reset token route registration' do
  # 定数ではなくメソッドにする（RSpec.describe内の定数はトップレベルに漏れ、再読込時に警告・衝突しうるため）
  def routes_file = Rails.root.join('config/routes.rb')
  def dev_path = '/dev/password_resets/token'

  def dev_route_registered?(env_name:, enable_value:)
    allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new(env_name))
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ENABLE_DEV_ENDPOINTS').and_return(enable_value)

    scratch = ActionDispatch::Routing::RouteSet.new
    source = File.read(routes_file).sub('Rails.application.routes.draw', 'scratch.draw')
    # rubocop:disable Security/Eval -- 自リポジトリの routes.rb を使い捨てRouteSetへ描画するためだけ
    binding.eval(source, routes_file.to_s)
    # rubocop:enable Security/Eval

    scratch.routes.any? { |route| route.path.spec.to_s.start_with?(dev_path) }
  end

  it 'routes.rb の書き換え対象が実在する（テスト自体が空振りしない）' do
    expect(File.read(routes_file)).to include('Rails.application.routes.draw')
  end

  it 'production + ENABLE_DEV_ENDPOINTS=true でも登録しない（最重要）' do
    expect(dev_route_registered?(env_name: 'production', enable_value: 'true')).to be(false)
  end

  it 'production + 未設定なら登録しない' do
    expect(dev_route_registered?(env_name: 'production', enable_value: nil)).to be(false)
  end

  it 'staging 等の未知の環境 + true でも登録しない' do
    expect(dev_route_registered?(env_name: 'staging', enable_value: 'true')).to be(false)
  end

  it 'development は環境変数なしでも登録する（既存動作の維持）' do
    expect(dev_route_registered?(env_name: 'development', enable_value: nil)).to be(true)
  end

  it 'test + ENABLE_DEV_ENDPOINTS=true なら登録する（E2E用の既存動作）' do
    expect(dev_route_registered?(env_name: 'test', enable_value: 'true')).to be(true)
  end

  it 'test + 未設定なら登録しない' do
    expect(dev_route_registered?(env_name: 'test', enable_value: nil)).to be(false)
  end

  it '本物のルート表（test・未設定）にも登録されていない（実際の起動結果の確認）' do
    registered = Rails.application.routes.routes.any? { |r| r.path.spec.to_s.start_with?(dev_path) }
    expect(registered).to eq(ENV['ENABLE_DEV_ENDPOINTS'] == 'true')
  end
end
