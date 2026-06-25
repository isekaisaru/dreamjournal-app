namespace :dream_profiles do
  desc "全ユーザーに「自分」プロフィールがなければ作成する（冪等・何度実行しても安全）"
  task ensure_self_profiles: :environment do
    total   = 0
    created = 0
    skipped = 0

    User.find_each do |user|
      total += 1

      profile = user.dream_profiles.find_or_create_by!(relationship: "self") do |p|
        p.name         = "自分"
        p.avatar_emoji = "😴"
        p.color        = "#6366f1"
        p.active       = true
        p.position     = 0
      end

      if profile.previously_new_record?
        created += 1
      else
        skipped += 1
      end
    end

    puts "完了: 対象 #{total} ユーザー | 作成 #{created} 件 | スキップ #{skipped} 件"
  end

  desc "dream_profile_id が未設定の既存の夢を、各ユーザーの「自分」プロフィールへ割り当てる（冪等・バッチ）"
  task backfill_dream_profile_id: :environment do
    assigned      = 0
    skipped_users = 0

    User.find_each do |user|
      self_profile = user.dream_profiles.find_by(relationship: "self")
      # self プロフィールが無いユーザーは先に ensure_self_profiles が必要。ここでは落とさず飛ばす。
      unless self_profile
        skipped_users += 1
        next
      end

      # 未設定（NULL）の夢だけをバッチで埋める。既に割り当て済みの夢は触らない（＝冪等）。
      # update_column でバリデーション/コールバックをスキップし、古いレコードでも安全に FK だけ設定する。
      user.dreams.where(dream_profile_id: nil).find_each do |dream|
        dream.update_column(:dream_profile_id, self_profile.id)
        assigned += 1
      end
    end

    remaining = Dream.where(dream_profile_id: nil).count
    puts "完了: 割当 #{assigned} 件 | selfなしスキップ #{skipped_users} ユーザー | 残NULL #{remaining} 件"
  end
end
