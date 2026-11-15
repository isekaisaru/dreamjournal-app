# frozen_string_literal: true

# 月ごとの利用状況を数える（読み取りだけ）。マネタイズ計画 M1「数える」用。
#
# - 出すのは合計の数だけで、メールアドレスやユーザーIDなど個人を特定できる値は出さない。
# - 月は日本時間（Asia/Tokyo）の1日0時から数える。
#   アプリの時刻は UTC のため、無料の月上限（分析・音声）は UTC の月初め＝日本時間の1日9時に戻る点に注意。
# - プランは「いま」の状態で分ける（その月の途中でプランを変えた人は、今のプランに入る）。
# - 費用は概算の単価をかけただけの目安。本当の費用は OpenAI の利用画面（Usage）の実額で確かめる。
#
# 使い方: bin/rails "usage:report[2026-11]"
class UsageReport
  TIME_ZONE = "Asia/Tokyo"
  YEAR_MONTH_FORMAT = /\A\d{4}-(0[1-9]|1[0-2])\z/
  PLANS = %w[free premium trial].freeze
  AI_FEATURES = %w[dream_analysis audio_analysis monthly_summary].freeze
  FEATURE_LABELS = {
    "dream_analysis" => "夢の分析",
    "audio_analysis" => "音声の記録（文字起こし＋分析）",
    "monthly_summary" => "月次サマリー",
    "image_generation" => "画像生成"
  }.freeze
  PLAN_LABELS = { "free" => "無料", "premium" => "プレミアム", "trial" => "お試し" }.freeze

  # 1回あたりの概算単価（円）。知識による見積もりで未確認（2026-11-15 時点・1ドル155円で計算）。
  ESTIMATED_UNIT_COST_JPY = {
    "dream_analysis" => 0.08,
    "audio_analysis" => 1.5,
    "monthly_summary" => 0.1,
    "image_generation" => 6.0
  }.freeze

  DAYS_BUCKETS = [["1日", 1, 1], ["2〜3日", 2, 3], ["4〜7日", 4, 7], ["8日以上", 8, nil]].freeze

  # users.premium / users.trial_user から「いま」のプランを決める
  PLAN_SQL = <<~SQL.squish.freeze
    CASE WHEN users.premium THEN 'premium'
         WHEN users.trial_user THEN 'trial'
         ELSE 'free' END
  SQL

  attr_reader :year_month

  def initialize(year_month:)
    raise ArgumentError, "年月は YYYY-MM の形で指定してください: #{year_month.inspect}" unless year_month.to_s.match?(YEAR_MONTH_FORMAT)

    @year_month = year_month.to_s
    year, month = @year_month.split("-").map(&:to_i)
    @from = ActiveSupport::TimeZone[TIME_ZONE].local(year, month, 1)
    @to = @from.next_month
  end

  def call
    usage = usage_by_feature
    {
      period: { year_month: year_month, from: @from.iso8601, to: @to.iso8601 },
      users: users_summary,
      usage: usage,
      dreams: dreams_summary,
      estimated_cost_jpy: estimated_cost(usage)
    }
  end

  def to_text
    data = call
    lines = []
    lines << "=== 利用状況 #{data[:period][:year_month]}（日本時間 #{data[:period][:from]} 〜 #{data[:period][:to]}）==="
    lines << ""
    lines << "■ ユーザー数（いまのプラン）"
    lines << "  全体: #{format_plans(data[:users][:total])}"
    lines << "  この月に登録: #{format_plans(data[:users][:signed_up_in_month])}"
    lines << ""
    lines << "■ AIの利用回数"
    (AI_FEATURES + ["image_generation"]).each do |feature|
      row = data[:usage][feature]
      lines << "  #{FEATURE_LABELS[feature]}: 合計 #{row[:total]}（#{format_plans(row[:by_plan])}）"
    end
    lines << ""
    lines << "■ 夢の記録"
    lines << "  書かれた夢: #{data[:dreams][:created]}件"
    lines << "  夢を書いた人数: #{format_plans(data[:dreams][:active_users])}"
    lines << "  この月に夢を書いた日数: " + data[:dreams][:days_written].map { |label, count| "#{label} #{count}人" }.join(" / ")
    lines << ""
    lines << "■ 概算の費用（目安・単価は未確認。実額は OpenAI の Usage で確認）"
    data[:estimated_cost_jpy][:by_feature].each do |feature, yen|
      lines << "  #{FEATURE_LABELS[feature]}: 約#{yen}円（1回 約#{ESTIMATED_UNIT_COST_JPY[feature]}円）"
    end
    lines << "  合計: 約#{data[:estimated_cost_jpy][:total]}円"
    lines.join("\n")
  end

  private

  def users_summary
    {
      total: plan_counts(User.all),
      signed_up_in_month: plan_counts(User.where(created_at: @from...@to))
    }
  end

  def usage_by_feature
    logs = AiUsageLog.joins(:user)
                     .where(created_at: @from...@to, feature: AI_FEATURES)
                     .group(:feature, Arel.sql(PLAN_SQL))
                     .count
    usage = AI_FEATURES.index_with do |feature|
      by_plan = PLANS.index_with { |plan| logs.fetch([feature, plan], 0) }
      { total: by_plan.values.sum, by_plan: by_plan }
    end

    images = DreamImageGeneration.joins(:user)
                                 .where(generated_at: @from...@to)
                                 .group(Arel.sql(PLAN_SQL))
                                 .count
    image_by_plan = PLANS.index_with { |plan| images.fetch(plan, 0) }
    usage["image_generation"] = { total: image_by_plan.values.sum, by_plan: image_by_plan }
    usage
  end

  def dreams_summary
    dreams = Dream.where(created_at: @from...@to)
    active = dreams.joins(:user).group(Arel.sql(PLAN_SQL)).distinct.count(:user_id)

    # 日本時間の日付で、1人が何日書いたかを数える（timestamp は UTC で保存されている）
    local_date = "DATE((dreams.created_at AT TIME ZONE 'UTC') AT TIME ZONE '#{TIME_ZONE}')"
    days_per_user = dreams.group(:user_id).distinct.count(Arel.sql(local_date)).values

    {
      created: dreams.count,
      active_users: PLANS.index_with { |plan| active.fetch(plan, 0) },
      days_written: DAYS_BUCKETS.to_h do |label, min, max|
        [label, days_per_user.count { |days| days >= min && (max.nil? || days <= max) }]
      end
    }
  end

  def estimated_cost(usage)
    by_feature = ESTIMATED_UNIT_COST_JPY.to_h do |feature, unit|
      [feature, (usage.dig(feature, :total).to_i * unit).round(2)]
    end
    { by_feature: by_feature, total: by_feature.values.sum.round(2) }
  end

  def plan_counts(scope)
    counts = scope.group(Arel.sql(PLAN_SQL)).count
    PLANS.index_with { |plan| counts.fetch(plan, 0) }
  end

  def format_plans(counts)
    PLANS.map { |plan| "#{PLAN_LABELS[plan]} #{counts[plan]}" }.join(" / ")
  end
end
