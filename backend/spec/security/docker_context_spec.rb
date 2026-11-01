# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Backend Docker build context' do
  let(:backend_root) { Rails.root }
  let(:dockerignore) { backend_root.join('.dockerignore').read.lines.map(&:strip) }
  let(:dockerfile) { backend_root.join('Dockerfile').read }

  it 'excludes local environment and Rails decryption keys' do
    expect(dockerignore).to include(
      '.env*',
      'config/master.key',
      'config/credentials/*.key'
    )
  end

  it 'excludes common private-key file formats' do
    expect(dockerignore).to include('*.key', '*.pem', '*.p12', '*.pfx')
  end

  it 'does not explicitly copy a secret file into the image' do
    expect(dockerfile).not_to match(/COPY\s+.*(?:master\.key|\.env|credentials\/.*\.key)/i)
  end
end
