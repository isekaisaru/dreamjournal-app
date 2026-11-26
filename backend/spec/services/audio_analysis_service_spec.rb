require 'rails_helper'

RSpec.describe AudioAnalysisService do
  let(:audio_api) { double('audio') }
  let(:client) { double('openai_client', audio: audio_api) }
  let(:audio_file) do
    Tempfile.new(['dream', '.webm']).tap do |f|
      f.write('fake audio')
      f.rewind
    end
  end

  before do
    @original_client = $openai_client
    @original_model = ENV['OPENAI_TRANSCRIBE_MODEL']
    $openai_client = client
  end

  after do
    $openai_client = @original_client
    ENV['OPENAI_TRANSCRIBE_MODEL'] = @original_model
    audio_file.close!
  end

  before do
    allow(client).to receive(:chat).and_return(
      { 'choices' => [{ 'message' => { 'content' => { analysis: 'ふしぎな夢', emotion_tags: ['ふしぎ'] }.to_json } }] }
    )
  end

  def used_transcribe_model
    model = nil
    allow(audio_api).to receive(:transcribe) do |parameters:|
      model = parameters[:model]
      { 'text' => 'うみのゆめ' }
    end
    described_class.new(audio_file).call
    model
  end

  it '環境変数が無いときは whisper-1 で文字起こしする' do
    ENV.delete('OPENAI_TRANSCRIBE_MODEL')
    expect(used_transcribe_model).to eq('whisper-1')
  end

  it 'OPENAI_TRANSCRIBE_MODEL を設定すると、そのモデルで文字起こしする' do
    ENV['OPENAI_TRANSCRIBE_MODEL'] = 'gpt-transcribe'
    expect(used_transcribe_model).to eq('gpt-transcribe')
  end
end
