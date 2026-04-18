require 'rails_helper'

RSpec.describe Dream, type: :model do
  let(:user) { create(:user) }

  describe 'バリデーション' do
    it { should validate_presence_of(:title) }
    it { should validate_length_of(:title).is_at_most(100) }
    it { should validate_presence_of(:content) }
    it { should validate_length_of(:content).is_at_most(1000) }
  end

  describe 'アソシエーション' do
    it { should belong_to(:user) }
    it { should have_many(:dream_emotions).dependent(:destroy) }
    it { should have_many(:emotions).through(:dream_emotions) }
  end

  describe 'スコープ' do
    let!(:dream_with_image) do
      create(:dream, user: user, generated_image_url: 'https://example.com/image.png', image_generated_at: Time.current)
    end
    let!(:dream_without_image) do
      create(:dream, user: user, generated_image_url: nil)
    end

    describe '.with_image' do
      it '画像URLが存在する夢だけを返す' do
        expect(Dream.with_image).to include(dream_with_image)
        expect(Dream.with_image).not_to include(dream_without_image)
      end
    end

    describe '.generated_in_month' do
      let!(:old_dream) do
        create(:dream, user: user, generated_image_url: 'https://example.com/old.png',
               image_generated_at: 2.months.ago)
      end

      it '当月に画像生成された夢だけを返す（引数省略時）' do
        expect(Dream.generated_in_month).to include(dream_with_image)
        expect(Dream.generated_in_month).not_to include(old_dream)
      end

      it '指定した月に画像生成された夢だけを返す' do
        expect(Dream.generated_in_month(2.months.ago)).to include(old_dream)
        expect(Dream.generated_in_month(2.months.ago)).not_to include(dream_with_image)
      end
    end

    describe '.analyzed' do
      let!(:done_dream)    { create(:dream, user: user, analysis_status: 'done') }
      let!(:pending_dream) { create(:dream, user: user, analysis_status: 'pending') }

      it '分析済みの夢だけを返す' do
        expect(Dream.analyzed).to include(done_dream)
        expect(Dream.analyzed).not_to include(pending_dream)
      end
    end
  end

  describe 'インスタンスメソッド' do
    let(:dream) { create(:dream, user: user) }

    describe '#start_analysis!' do
      it 'analysis_status を pending にしてanalysis_jsonをnilにする' do
        dream.update!(analysis_status: 'done', analysis_json: { analysis: 'test' })
        dream.start_analysis!
        expect(dream.analysis_status).to eq('pending')
        expect(dream.analysis_json).to be_nil
      end
    end

    describe '#mark_done!' do
      it 'analysis_status を done にしてpayloadを保存する' do
        payload = { analysis: '空を飛ぶ夢は自由の象徴です', emotion_tags: ['happy'] }
        dream.mark_done!(payload)
        expect(dream.analysis_status).to eq('done')
        expect(dream.analysis_json['analysis']).to eq('空を飛ぶ夢は自由の象徴です')
        expect(dream.analyzed_at).to be_present
      end
    end

    describe '#mark_failed!' do
      it 'analysis_status を failed にしてエラーメッセージを保存する' do
        dream.mark_failed!('OpenAI APIエラー')
        expect(dream.analysis_status).to eq('failed')
        expect(dream.analysis_json['error']).to eq('OpenAI APIエラー')
        expect(dream.analyzed_at).to be_present
      end
    end
  end
end
