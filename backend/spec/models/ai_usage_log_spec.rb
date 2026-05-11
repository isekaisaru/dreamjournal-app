require 'rails_helper'

RSpec.describe AiUsageLog, type: :model do
  let(:user) { create(:user) }

  describe 'バリデーション' do
    it '有効なfeatureで作成できる' do
      AiUsageLog::FEATURES.each do |feature|
        log = AiUsageLog.new(user: user, feature: feature)
        expect(log).to be_valid
      end
    end

    it 'featureが空のときは無効' do
      log = AiUsageLog.new(user: user, feature: '')
      expect(log).not_to be_valid
    end

    it '未定義のfeatureは無効' do
      log = AiUsageLog.new(user: user, feature: 'undefined_feature')
      expect(log).not_to be_valid
    end

    it 'userがないときは無効' do
      log = AiUsageLog.new(user: nil, feature: 'dream_analysis')
      expect(log).not_to be_valid
    end
  end

  describe '.today_for_user スコープ' do
    it '今日の同ユーザー・同featureのログだけを返す' do
      today_log    = create(:ai_usage_log, user: user, feature: 'dream_analysis')
      _other_feat  = create(:ai_usage_log, user: user, feature: 'image_generation')
      _other_user  = create(:ai_usage_log, feature: 'dream_analysis')
      _yesterday   = create(:ai_usage_log, user: user, feature: 'dream_analysis',
                            created_at: 1.day.ago)

      result = AiUsageLog.today_for_user(user, 'dream_analysis')
      expect(result).to contain_exactly(today_log)
    end

    it '今日のログがなければ空を返す' do
      create(:ai_usage_log, user: user, feature: 'dream_analysis', created_at: 1.day.ago)

      expect(AiUsageLog.today_for_user(user, 'dream_analysis')).to be_empty
    end
  end
end
