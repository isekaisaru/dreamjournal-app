# frozen_string_literal: true

require 'rails_helper'

RSpec.describe "Rack::Attack rate limiting", type: :request do
  before do
    @original_cache_store = Rack::Attack.cache.store
    # このスペックではレート制限を有効化
    Rack::Attack.enabled = true
    # null_store ではカウンタが永続化されないため MemoryStore を使用
    Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new
    Rack::Attack.reset!
  end

  after do
    Rack::Attack.enabled = false
    Rack::Attack.cache.store = @original_cache_store
  end

  describe "POST /dreams/preview_analysis (AI分析)" do
    let(:user) { create(:user) }
    let(:access_token) { AuthService.encode_token(user.id) }

    before do
      # OpenAI をモックして実際のAPI呼び出しを防ぐ（クラスメソッド）
      allow(DreamAnalysisService).to receive(:analyze).and_return({
        analysis: "テスト分析",
        emotion_tags: ["happy"]
      })
    end

    it "11回目のリクエストで 429 を返す" do
      10.times do
        post "/dreams/preview_analysis",
             params: { content: "空を飛ぶ夢" }.to_json,
             headers: {
               "Content-Type" => "application/json",
               "Cookie" => "access_token=#{access_token}"
             }
      end

      post "/dreams/preview_analysis",
           params: { content: "空を飛ぶ夢" }.to_json,
           headers: {
             "Content-Type" => "application/json",
             "Cookie" => "access_token=#{access_token}"
           }

      expect(response).to have_http_status(429)
      body = JSON.parse(response.body)
      expect(body["error"]).to include("リクエストが多すぎます")
      expect(body["retry_after"]).to be_present
    end
  end

  describe "POST /auth/login (ブルートフォース対策)" do
    it "同一IPから6回目のログイン試行で 429 を返す" do
      5.times do
        post "/auth/login",
             params: { email: "test@example.com", password: "wrong" }.to_json,
             headers: { "Content-Type" => "application/json" }
      end

      post "/auth/login",
           params: { email: "test@example.com", password: "wrong" }.to_json,
           headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(429)
    end
  end

  describe "POST /auth/register (大量登録防止)" do
    it "同一IPから6回目の登録で 429 を返す" do
      5.times do |i|
        post "/auth/register",
             params: { user: { email: "user#{i}@example.com", username: "user#{i}", password: "pass1234", password_confirmation: "pass1234" } }.to_json,
             headers: { "Content-Type" => "application/json" }
      end

      post "/auth/register",
           params: { user: { email: "extra@example.com", username: "extra", password: "pass1234", password_confirmation: "pass1234" } }.to_json,
           headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(429)
    end
  end

  describe "POST /dreams/:id/generate_image (DALL-E 3 レート制限)" do
    let(:user) { create(:user) }
    let(:dream) { create(:dream, user: user, content: "雲の上を歩く夢") }
    let(:access_token) { AuthService.encode_token(user.id) }
    let(:images_client) { double("OpenAI::Images") }
    let(:openai_client) { double("OpenAI::Client", images: images_client) }

    before do
      @original_openai_client = $openai_client
      $openai_client = openai_client
      allow(images_client).to receive(:generate).and_return({
        "data" => [{ "url" => "https://oaidalleapiprodscus.blob.core.windows.net/generated/test.png" }]
      })
    end

    after do
      $openai_client = @original_openai_client
    end

    it "1日3回まで成功し、4回目は 429 を返す" do
      3.times do
        post "/dreams/#{dream.id}/generate_image",
             params: {}.to_json,
             headers: { "Content-Type" => "application/json", "Cookie" => "access_token=#{access_token}" }
        expect(response).to have_http_status(:ok)
      end

      post "/dreams/#{dream.id}/generate_image",
           params: {}.to_json,
           headers: { "Content-Type" => "application/json", "Cookie" => "access_token=#{access_token}" }

      expect(response).to have_http_status(429)
      body = JSON.parse(response.body)
      expect(body["error"]).to include("リクエストが多すぎます")
      expect(body["retry_after"]).to eq(24.hours.to_i)
    end
  end
end
