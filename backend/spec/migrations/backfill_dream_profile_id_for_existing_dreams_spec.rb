require 'rails_helper'
require Rails.root.join('db/migrate/20260703000000_backfill_dream_profile_id_for_existing_dreams.rb')

RSpec.describe BackfillDreamProfileIdForExistingDreams do
  subject(:migration) { described_class.new }

  def run_migration
    original = $stdout
    $stdout = StringIO.new
    migration.up
  ensure
    $stdout = original
  end

  context 'self プロフィールが無く、未紐付けの夢があるユーザー' do
    let!(:user) { create(:user) }
    let!(:legacy_dream) { create(:dream, user: user, dream_profile_id: nil) }

    it 'self プロフィールを作成する' do
      expect { run_migration }.to change(DreamProfile, :count).by(1)
      profile = user.dream_profiles.find_by(relationship: 'self')
      expect(profile).to be_present
      expect(profile.name).to eq('自分')
      expect(profile.avatar_emoji).to eq('😴')
      expect(profile.color).to eq('#6366f1')
      expect(profile.active).to eq(true)
      expect(profile.position).to eq(0)
    end

    it '作成した self プロフィールに夢を紐付ける' do
      run_migration
      expect(legacy_dream.reload.dream_profile_id).to eq(user.dream_profiles.find_by(relationship: 'self').id)
    end

    it '実行後は未紐付けの夢が残らない' do
      run_migration
      expect(Dream.where(dream_profile_id: nil).count).to eq(0)
    end
  end

  context 'すでに self プロフィールを持つユーザー' do
    let!(:user) { create(:user) }
    let!(:self_profile) { create(:dream_profile, :self_profile, user: user) }
    let!(:legacy_dream) { create(:dream, user: user, dream_profile_id: nil) }

    it 'self プロフィールを重複作成しない' do
      expect { run_migration }.not_to change(DreamProfile, :count)
    end

    it '既存の self プロフィールに夢を紐付ける' do
      run_migration
      expect(legacy_dream.reload.dream_profile_id).to eq(self_profile.id)
    end
  end

  context '他プロフィールに割り当て済みの夢' do
    let!(:user) { create(:user) }
    let!(:self_profile) { create(:dream_profile, :self_profile, user: user) }
    let!(:other_profile) { create(:dream_profile, user: user) }
    let!(:assigned_dream) { create(:dream, user: user, dream_profile_id: other_profile.id) }

    it '割り当て済みの夢は変更しない' do
      expect { run_migration }.not_to change { assigned_dream.reload.dream_profile_id }
      expect(assigned_dream.dream_profile_id).to eq(other_profile.id)
    end
  end

  context '他ユーザーの self プロフィールには紐付かない' do
    let!(:user_a) { create(:user) }
    let!(:user_b) { create(:user) }
    let!(:self_profile_b) { create(:dream_profile, :self_profile, user: user_b) }
    let!(:dream_a) { create(:dream, user: user_a, dream_profile_id: nil) }

    it 'user_a の夢は user_a 自身の self プロフィールにのみ紐付く' do
      run_migration
      expect(dream_a.reload.dream_profile_id).to eq(user_a.dream_profiles.find_by(relationship: 'self').id)
      expect(dream_a.dream_profile_id).not_to eq(self_profile_b.id)
    end
  end

  context '夢を持たないユーザー' do
    let!(:user) { create(:user) }

    it 'self プロフィールだけは作成される' do
      expect { run_migration }.to change(DreamProfile, :count).by(1)
    end
  end

  context '2回実行した場合（冪等性）' do
    let!(:user) { create(:user) }
    let!(:legacy_dream) { create(:dream, user: user, dream_profile_id: nil) }

    it 'self プロフィール数が変わらない' do
      run_migration
      expect { run_migration }.not_to change(DreamProfile, :count)
    end

    it '夢の紐付け先が変わらない' do
      run_migration
      assigned_id = legacy_dream.reload.dream_profile_id
      expect { run_migration }.not_to change { legacy_dream.reload.dream_profile_id }
      expect(legacy_dream.reload.dream_profile_id).to eq(assigned_id)
    end
  end

  context '出力確認' do
    let!(:user) { create(:user) }
    let!(:legacy_dream) { create(:dream, user: user, dream_profile_id: nil) }

    it '作成件数・紐付け件数・残NULL件数をログ出力する' do
      expect(Rails.logger).to receive(:info).with(
        a_string_matching(/self profile作成 1 件.*dream紐付け 1 件.*残NULL 0 件/)
      )
      run_migration
    end
  end
end
