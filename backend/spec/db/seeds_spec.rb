require 'rails_helper'

# backend/db/seeds.rb の回帰テスト。
#
# 経緯: ensure_dream が dream_profile_id を設定せずに Dream を作成しており、
# dreams.dream_profile_id の NOT NULL 制約（#413）に反して db:seed が失敗していた。
# 実際の登録導線（UsersController#create）と同じ形で「自分」プロフィールを
# 用意してから夢を作るよう修正したが、db:seed 自体はCIで一度も実行されないため、
# 同種の書き忘れが再発してもCIでは検知できない。このspecは
# Rails.application.load_seed を直接呼び、その完走と結果を検証することで
# db:seed の健全性だけをCIで守る。
RSpec.describe 'db:seed (backend/db/seeds.rb)' do
  DEMO_EMAILS = %w[family_demo@example.com child_demo@example.com].freeze

  # db/seeds.rb は 'Seeding of emotions and demo users completed.' を
  # puts するため、テスト出力を汚さないよう stdout を抑制する。
  def run_seed
    original = $stdout
    $stdout = StringIO.new
    Rails.application.load_seed
  ensure
    $stdout = original
  end

  def demo_users
    User.where(email: DEMO_EMAILS)
  end

  it '例外なく完走する' do
    expect { run_seed }.not_to raise_error
  end

  it '対象デモユーザーが2件作成される' do
    run_seed
    expect(demo_users.count).to eq(2)
  end

  it '対象デモユーザーごとに relationship: "self" のプロフィールが1件だけ存在する' do
    run_seed

    demo_users.find_each do |user|
      expect(user.dream_profiles.where(relationship: 'self').count).to eq(1)
    end
  end

  it '対象となるすべてのデモ夢に dream_profile_id が設定される' do
    run_seed

    dreams = Dream.where(user: demo_users)
    expect(dreams).to be_present
    expect(dreams.pluck(:dream_profile_id)).to all(be_present)
  end

  it '各デモ夢の user_id と、その dream_profile の user_id が一致する' do
    run_seed

    Dream.where(user: demo_users).includes(:dream_profile).find_each do |dream|
      expect(dream.dream_profile).to be_present
      expect(dream.dream_profile.user_id).to eq(dream.user_id)
    end
  end

  it '2回実行しても、対象デモユーザー・selfプロフィール・デモ夢の件数が増えない' do
    run_seed

    before_user_count = demo_users.count
    before_self_profile_count = DreamProfile.where(user: demo_users, relationship: 'self').count
    before_dream_count = Dream.where(user: demo_users).count

    expect { run_seed }.not_to raise_error

    expect(demo_users.count).to eq(before_user_count)
    expect(DreamProfile.where(user: demo_users, relationship: 'self').count).to eq(before_self_profile_count)
    expect(Dream.where(user: demo_users).count).to eq(before_dream_count)
  end
end
