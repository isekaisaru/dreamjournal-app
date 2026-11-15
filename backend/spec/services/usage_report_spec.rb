require 'rails_helper'

RSpec.describe UsageReport do
  # 2026-11 を日本時間で数える。UTC では 2026-10-31 15:00 〜 2026-11-30 15:00。
  let(:report) { described_class.new(year_month: '2026-11').call }
  let(:in_month) { Time.utc(2026, 11, 10, 3, 0) }
  let(:before_month) { Time.utc(2026, 10, 20, 3, 0) }

  let!(:free_user) { create(:user, premium: false, trial_user: false) }
  let!(:premium_user) { create(:user, premium: true) }
  let!(:trial_user) { create(:user, trial_user: true, premium: false) }

  describe '引数' do
    it '年月の形式が正しくなければ ArgumentError' do
      expect { described_class.new(year_month: '2026-13') }.to raise_error(ArgumentError)
      expect { described_class.new(year_month: '2026/11') }.to raise_error(ArgumentError)
    end

    it '期間を日本時間の月の初めから次の月の初めまでで表す' do
      expect(report[:period][:from]).to eq('2026-11-01T00:00:00+09:00')
      expect(report[:period][:to]).to eq('2026-12-01T00:00:00+09:00')
    end
  end

  describe 'AIの利用回数' do
    before do
      create_list(:ai_usage_log, 3, user: free_user, feature: 'dream_analysis', created_at: in_month)
      create_list(:ai_usage_log, 2, user: premium_user, feature: 'dream_analysis', created_at: in_month)
      create(:ai_usage_log, user: trial_user, feature: 'dream_analysis', created_at: in_month)
      create(:ai_usage_log, user: premium_user, feature: 'audio_analysis', created_at: in_month)
      create(:ai_usage_log, user: premium_user, feature: 'monthly_summary', created_at: in_month)
      create(:ai_usage_log, user: free_user, feature: 'dream_analysis', created_at: before_month)
    end

    it '機能ごと・プランごとに、その月の回数だけを数える' do
      analysis = report[:usage]['dream_analysis']
      expect(analysis[:total]).to eq(6)
      expect(analysis[:by_plan]).to eq('free' => 3, 'premium' => 2, 'trial' => 1)
      expect(report[:usage]['audio_analysis'][:total]).to eq(1)
      expect(report[:usage]['monthly_summary'][:total]).to eq(1)
    end

    it '日本時間の月の境目で数える' do
      # 日本時間 11/1 0:30（UTC 10/31 15:30）は11月、日本時間 10/31 23:30（UTC 10/31 14:30）は10月
      create(:ai_usage_log, user: free_user, feature: 'audio_analysis', created_at: Time.utc(2026, 10, 31, 15, 30))
      create(:ai_usage_log, user: free_user, feature: 'audio_analysis', created_at: Time.utc(2026, 10, 31, 14, 30))

      expect(report[:usage]['audio_analysis'][:by_plan]['free']).to eq(1)
    end
  end

  describe '画像生成の回数' do
    it '生成日時でその月の回数をプランごとに数える' do
      premium_dream = create(:dream, user: premium_user)
      create_list(:dream_image_generation, 2, dream: premium_dream, generated_at: in_month)
      create(:dream_image_generation, dream: premium_dream, generated_at: before_month)

      images = report[:usage]['image_generation']
      expect(images[:total]).to eq(2)
      expect(images[:by_plan]).to eq('free' => 0, 'premium' => 2, 'trial' => 0)
    end
  end

  describe 'ユーザー数' do
    it 'いまのプランごとの人数と、その月に登録した人数を数える' do
      free_user.update_column(:created_at, in_month)
      premium_user.update_column(:created_at, before_month)
      trial_user.update_column(:created_at, before_month)

      expect(report[:users][:total]).to eq('free' => 1, 'premium' => 1, 'trial' => 1)
      expect(report[:users][:signed_up_in_month]).to eq('free' => 1, 'premium' => 0, 'trial' => 0)
    end
  end

  describe '夢の記録と、続いた日数' do
    it '夢を書いた人数と、日本時間で何日書いたかの分布を数える' do
      # free_user: 同じ日に2つ＋別の日に1つ＝2日。premium_user: 1日だけ。trial_user: 先月だけ。
      create(:dream, user: free_user, created_at: Time.utc(2026, 11, 2, 1, 0))
      create(:dream, user: free_user, created_at: Time.utc(2026, 11, 2, 5, 0))
      create(:dream, user: free_user, created_at: Time.utc(2026, 11, 5, 1, 0))
      create(:dream, user: premium_user, created_at: in_month)
      create(:dream, user: trial_user, created_at: before_month)

      dreams = report[:dreams]
      expect(dreams[:created]).to eq(4)
      expect(dreams[:active_users]).to eq('free' => 1, 'premium' => 1, 'trial' => 0)
      expect(dreams[:days_written]).to eq('1日' => 1, '2〜3日' => 1, '4〜7日' => 0, '8日以上' => 0)
    end

    it '日本時間の同じ日に書いた夢は1日と数える' do
      # UTC では別の日だが、日本時間ではどちらも 11/3
      create(:dream, user: free_user, created_at: Time.utc(2026, 11, 2, 16, 0))
      create(:dream, user: free_user, created_at: Time.utc(2026, 11, 3, 14, 0))

      expect(report[:dreams][:days_written]['1日']).to eq(1)
    end
  end

  describe '概算の費用' do
    it '回数に概算の単価をかけて合計する' do
      create_list(:ai_usage_log, 10, user: free_user, feature: 'dream_analysis', created_at: in_month)
      premium_dream = create(:dream, user: premium_user)
      create(:dream_image_generation, dream: premium_dream, generated_at: in_month)

      units = described_class::ESTIMATED_UNIT_COST_JPY
      expected = (10 * units['dream_analysis'] + units['image_generation']).round(2)
      expect(report[:estimated_cost_jpy][:total]).to eq(expected)
    end
  end

  describe '文章での出力' do
    it '見出しを含み、メールアドレスやユーザーIDを含まない' do
      create(:ai_usage_log, user: free_user, feature: 'dream_analysis', created_at: in_month)

      text = described_class.new(year_month: '2026-11').to_text

      expect(text).to include('2026-11', 'AIの利用回数', '画像生成', '夢を書いた人数', '概算')
      expect(text).not_to include(free_user.email)
      expect(text).not_to match(/user_id/)
    end
  end
end
