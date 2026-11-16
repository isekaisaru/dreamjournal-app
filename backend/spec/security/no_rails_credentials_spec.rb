# frozen_string_literal: true

require 'rails_helper'

# このアプリは Rails の credentials（credentials.yml.enc と master key）を使わない。
# 公開リポジトリの履歴に古い master key が残っているため、credentials を使う形に
# 戻ると、その鍵で中身を読まれるおそれがある。秘密の値は環境変数から読む。
RSpec.describe 'Rails credentials are not used' do
  let(:backend_root) { Rails.root }

  it 'does not ship an encrypted credentials file' do
    expect(backend_root.join('config/credentials.yml.enc')).not_to exist
    expect(Dir.glob(backend_root.join('config/credentials/*.yml.enc'))).to be_empty
  end

  it 'does not read Rails.application.credentials in app, config or lib' do
    files = Dir.glob(backend_root.join('{app,config,lib}/**/*.{rb,yml,erb}'))
    offenders = files.select { |path| File.read(path).include?('Rails.application.credentials') }

    expect(offenders.map { |path| Pathname(path).relative_path_from(backend_root).to_s }).to eq([])
  end

  it 'boots with empty credentials' do
    expect(Rails.application.credentials.config).to eq({})
  end
end
