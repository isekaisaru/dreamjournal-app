require 'rails_helper'

RSpec.describe 'Health API', type: :request do
  describe 'GET /health/live' do
    it 'returns 200 regardless of database state' do
      get '/health/live', headers: { 'HOST' => 'backend' }

      expect(response).to have_http_status(:ok)
      expect(json_response['status']).to eq('ok')
    end
  end

  describe 'GET /health/ready' do
    it 'returns 200 when database is connected' do
      get '/health/ready', headers: { 'HOST' => 'backend' }

      expect(response).to have_http_status(:ok)
      expect(json_response['status']).to eq('ok')
      expect(json_response['db']).to eq('connected')
    end
  end
end
