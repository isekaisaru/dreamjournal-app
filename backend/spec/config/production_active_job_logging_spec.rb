require 'rails_helper'

RSpec.describe 'production Active Job logging configuration' do
  it 'does not log serialized job arguments' do
    production_config = Rails.root.join('config/environments/production.rb').read

    expect(production_config).to include('config.active_job.log_arguments = false')
  end
end
