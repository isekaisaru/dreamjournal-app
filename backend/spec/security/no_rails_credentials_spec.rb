# frozen_string_literal: true

require 'rails_helper'

# このアプリは Rails の credentials（credentials.yml.enc と master key）を使わない。
# 公開リポジトリの履歴に古い master key が残っているため、credentials を使う形に
# 戻ると、その鍵で中身を読まれるおそれがある。秘密の値は環境変数から読む。
RSpec.describe 'Rails credentials are not used' do
  let(:backend_root) { Rails.root }

  # Rails.application.credentials / app.credentials / config.credentials と、
  # credentials.dig などの読み出し。CORS の `credentials: true` には当たらない。
  let(:credentials_read) do
    /(?:Rails\.application|\bapp|\bconfig)\.credentials\b|\bcredentials\.(?:dig|config|fetch|secret_key_base)\b/
  end

  it 'does not ship an encrypted credentials file' do
    expect(backend_root.join('config/credentials.yml.enc')).not_to exist
    expect(Dir.glob(backend_root.join('config/credentials/*.yml.enc'))).to be_empty
  end

  it 'does not read credentials in app, config, lib, db or bin' do
    files = Dir.glob(backend_root.join('{app,config,lib,db}/**/*.{rb,rake,yml,erb}')) +
            Dir.glob(backend_root.join('bin/*'))
    offenders = files.uniq.select { |path| File.file?(path) && File.read(path).match?(credentials_read) }

    expect(offenders.map { |path| Pathname(path).relative_path_from(backend_root).to_s }).to eq([])
  end

  it 'boots with empty credentials' do
    expect(Rails.application.credentials.config).to eq({})
  end
end
