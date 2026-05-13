require 'spec_helper'
require 'active_support/core_ext/object/blank'
require_relative '../../app/services/dream_analysis_service'

RSpec.describe DreamAnalysisService do
  describe '.analyze' do
    around do |example|
      previous_client = $openai_client
      $openai_client = nil
      example.run
    ensure
      $openai_client = previous_client
    end

    it 'returns a handled error when OPENAI_API_KEY is not configured' do
      stub_const('Rails', double(logger: double(error: nil)))
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('OPENAI_API_KEY').and_return(nil)
      expect(OpenAI::Client).not_to receive(:new)

      result = described_class.analyze('空を飛ぶ夢')

      expect(result[:error]).to eq('AI分析サービスの設定が不足しています。時間をおいてもう一度お試しください。')
    end
  end
end
