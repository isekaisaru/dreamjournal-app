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

    it 'does not expose database exception details when readiness fails' do
      allow(ApplicationRecord).to receive_message_chain(:connection, :execute)
        .and_raise(StandardError, 'sensitive database host and credential details')

      get '/health/ready', headers: { 'HOST' => 'backend' }

      expect(response).to have_http_status(:service_unavailable)
      expect(json_response).to eq('status' => 'error', 'db' => 'disconnected')
      expect(response.body).not_to include('sensitive')
    end
  end

  describe 'GET /health/detailed' do
    it 'requires authentication' do
      get '/health/detailed', headers: { 'HOST' => 'backend' }

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
