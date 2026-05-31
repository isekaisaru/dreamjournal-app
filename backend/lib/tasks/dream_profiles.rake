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
end
