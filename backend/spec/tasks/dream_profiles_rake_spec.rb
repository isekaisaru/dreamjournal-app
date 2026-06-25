require 'rails_helper'

RSpec.describe 'rake dream_profiles:ensure_self_profiles' do
  # Rake タスクは一度だけロードすればよい
  before(:all) do
    Rails.application.load_tasks
  end

  # Rake タスクは1回しか実行されないため、各テスト前に reenable する
  def invoke_task
    Rake::Task['dream_profiles:ensure_self_profiles'].reenable
    # テスト出力を汚さないよう stdout を抑制
    original = $stdout
    $stdout = StringIO.new
    Rake::Task['dream_profiles:ensure_self_profiles'].invoke
  ensure
    $stdout = original
  end

  # ------------------------------------------------------------------ #
  # self プロフィールがないユーザーへの作成                             #
  # ------------------------------------------------------------------ #
  context 'self プロフィールがないユーザーが複数いる場合' do
    let!(:user_a) { create(:user) }
    let!(:user_b) { create(:user) }

    it '全員分の self プロフィールを作成する' do
      expect { invoke_task }.to change(DreamProfile, :count).by(2)
    end

    it '作成されたプロフィールが正しい初期値を持つ' do
      invoke_task
      [user_a, user_b].each do |u|
        profile = u.dream_profiles.find_by(relationship: 'self')
        expect(profile).to be_present
        expect(profile.name).to eq('自分')
        expect(profile.avatar_emoji).to eq('😴')
        expect(profile.color).to eq('#6366f1')
        expect(profile.active).to eq(true)
        expect(profile.position).to eq(0)
      end
    end
  end

  # ------------------------------------------------------------------ #
  # 既存の self プロフィールはスキップ                                  #
  # ------------------------------------------------------------------ #
  context '一部のユーザーがすでに self プロフィールを持つ場合' do
    let!(:user_has) do
      u = create(:user)
      create(:dream_profile, :self_profile, user: u)
      u
    end
    let!(:user_no) { create(:user) }

    it '持っていないユーザーにだけ作成する' do
      expect { invoke_task }.to change(DreamProfile, :count).by(1)
    end

    it '既存の self プロフィールを重複させない' do
      invoke_task
      expect(user_has.dream_profiles.where(relationship: 'self').count).to eq(1)
    end

    it '不足していたユーザーに self プロフィールができている' do
      invoke_task
      expect(user_no.dream_profiles.find_by(relationship: 'self')).to be_present
    end
  end

  # ------------------------------------------------------------------ #
  # 冪等性（2回実行しても重複しない）                                   #
  # ------------------------------------------------------------------ #
  context '2回実行した場合' do
    let!(:user) { create(:user) }

    it 'プロフィール数が変わらない' do
      invoke_task
      expect { invoke_task }.not_to change(DreamProfile, :count)
    end

    it 'self プロフィールは1件のまま' do
      invoke_task
      invoke_task
      expect(user.dream_profiles.where(relationship: 'self').count).to eq(1)
    end
  end

  # ------------------------------------------------------------------ #
  # 全員がすでに self プロフィールを持つ場合                           #
  # ------------------------------------------------------------------ #
  context '全ユーザーがすでに self プロフィールを持つ場合' do
    let!(:user) do
      u = create(:user)
      create(:dream_profile, :self_profile, user: u)
      u
    end

    it '何も作成しない' do
      expect { invoke_task }.not_to change(DreamProfile, :count)
    end
  end

  # ------------------------------------------------------------------ #
  # stdout 出力の確認                                                   #
  # ------------------------------------------------------------------ #
  context '出力確認' do
    let!(:user_a) { create(:user) }
    let!(:user_b) do
      u = create(:user)
      create(:dream_profile, :self_profile, user: u)
      u
    end

    it '対象数・作成数・スキップ数を出力する' do
      Rake::Task['dream_profiles:ensure_self_profiles'].reenable
      output = StringIO.new
      original = $stdout
      $stdout = output
      Rake::Task['dream_profiles:ensure_self_profiles'].invoke
      $stdout = original

      result = output.string
      expect(result).to include('対象 2 ユーザー')
      expect(result).to include('作成 1 件')
      expect(result).to include('スキップ 1 件')
    end
  end
end

RSpec.describe 'rake dream_profiles:backfill_dream_profile_id' do
  before(:all) do
    Rails.application.load_tasks
  end

  def invoke_task
    Rake::Task['dream_profiles:backfill_dream_profile_id'].reenable
    original = $stdout
    $stdout = StringIO.new
    Rake::Task['dream_profiles:backfill_dream_profile_id'].invoke
  ensure
    $stdout = original
  end

  context 'dream_profile_id が未設定の夢があるユーザー' do
    let!(:user) { create(:user) }
    let!(:self_profile) { create(:dream_profile, :self_profile, user: user) }
    let!(:legacy_dream) { create(:dream, user: user, dream_profile_id: nil) }

    it '未設定の夢を self プロフィールに割り当てる' do
      invoke_task
      expect(legacy_dream.reload.dream_profile_id).to eq(self_profile.id)
    end

    it '実行後は未設定の夢が残らない' do
      invoke_task
      expect(Dream.where(dream_profile_id: nil).count).to eq(0)
    end
  end

  context 'すでに別プロフィールが割り当て済みの夢' do
    let!(:user) { create(:user) }
    let!(:self_profile) { create(:dream_profile, :self_profile, user: user) }
    let!(:other_profile) { create(:dream_profile, user: user) }
    let!(:assigned_dream) { create(:dream, user: user, dream_profile_id: other_profile.id) }

    it '割り当て済みの夢は変更しない（冪等）' do
      expect { invoke_task }.not_to change { assigned_dream.reload.dream_profile_id }
      expect(assigned_dream.dream_profile_id).to eq(other_profile.id)
    end
  end

  context 'self プロフィールが無いユーザー' do
    let!(:user) { create(:user) }
    let!(:orphan_dream) { create(:dream, user: user, dream_profile_id: nil) }

    it 'スキップして落ちず、その夢は未設定のまま残る' do
      expect { invoke_task }.not_to raise_error
      expect(orphan_dream.reload.dream_profile_id).to be_nil
    end
  end

  context '2回実行した場合' do
    let!(:user) { create(:user) }
    let!(:self_profile) { create(:dream_profile, :self_profile, user: user) }
    let!(:legacy_dream) { create(:dream, user: user, dream_profile_id: nil) }

    it '2回目で割り当て先が変わらない' do
      invoke_task
      expect { invoke_task }.not_to change { legacy_dream.reload.dream_profile_id }
    end
  end
end
