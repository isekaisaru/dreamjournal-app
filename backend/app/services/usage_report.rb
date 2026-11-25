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

  # つづき具合（マネタイズ計画 M2〜M4 用）。月をまたいで、最初に書いた日から最後に書いた日まで（両端を含む）を数える。
  NOT_WRITTEN_LABEL = "まだ書いていない"
  SPAN_BUCKETS = [["1日", 1, 1], ["2〜6日", 2, 6], ["7〜13日", 7, 13], ["14日以上", 14, nil]].freeze
  # M4「2週間以上つづける人が3人以上出たら、プレミアムを案内する」の目安
  LONG_SPAN_DAYS = 14
  LONG_SPAN_TARGET_USERS = 3
  # 最後に書いてから何日たったか（どこで止まったか）
  RECENCY_BUCKETS = [["7日以内", 0, 7], ["8〜30日", 8, 30], ["31日以上", 31, nil]].freeze

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
      continuation: continuation_summary,
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
    continuation = data[:continuation]
    lines << "■ つづき具合（お試しを除く #{continuation[:users]}人・#{continuation[:as_of]} 時点・月をまたいで数える）"
    lines << "  最初に書いた日から最後に書いた日まで: " + format_buckets(continuation[:span_days])
    lines << "  #{LONG_SPAN_DAYS}日以上つづいた人: #{continuation[:long_span_users]}人（M4 の目安は#{LONG_SPAN_TARGET_USERS}人以上）"
    lines << "  最後に書いてから: " + format_buckets(continuation[:days_since_last_written])
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
    days_per_user = dreams.group(:user_id).distinct.count(Arel.sql(local_date_sql)).values

    {
      created: dreams.count,
      active_users: PLANS.index_with { |plan| active.fetch(plan, 0) },
      days_written: DAYS_BUCKETS.to_h do |label, min, max|
        [label, days_per_user.count { |days| days >= min && (max.nil? || days <= max) }]
      end
    }
  end

  # 「何日つづいたか」と「どこで止まったか」を、集計期間の終わり（今月なら今日）の時点で数える。
  # 1人ずつの値は出さず、人数の分布だけを返す。
  def continuation_summary
    as_of = continuation_as_of
    # trial_user は NULL のことがある（ふつうの利用者）ので、プランの決め方（PLAN_SQL）でお試しだけを外す
    users = User.where("(#{PLAN_SQL}) <> 'trial'").where("users.created_at < ?", @to)
    first_and_last = Dream.joins(:user)
                          .merge(users)
                          .where("dreams.created_at < ?", @to)
                          .group(:user_id)
                          .pluck(Arel.sql("MIN(#{local_date_sql})"), Arel.sql("MAX(#{local_date_sql})"))
    spans = first_and_last.map { |first, last| (last - first).to_i + 1 }
    since_last = first_and_last.map { |_first, last| (as_of - last).to_i }

    span_days = { NOT_WRITTEN_LABEL => users.count - first_and_last.size }.merge(count_buckets(spans, SPAN_BUCKETS))
    {
      as_of: as_of.iso8601,
      users: users.count,
      span_days: span_days,
      long_span_users: spans.count { |days| days >= LONG_SPAN_DAYS },
      days_since_last_written: count_buckets(since_last, RECENCY_BUCKETS)
    }
  end

  # 集計期間の最後の日（今月の途中なら今日）を日本時間の日付で返す
  def continuation_as_of
    ([@to, Time.current].min - 1.second).in_time_zone(TIME_ZONE).to_date
  end

  def local_date_sql
    "DATE((dreams.created_at AT TIME ZONE 'UTC') AT TIME ZONE '#{TIME_ZONE}')"
  end

  def count_buckets(values, buckets)
    buckets.to_h do |label, min, max|
      [label, values.count { |value| value >= min && (max.nil? || value <= max) }]
    end
  end

  def format_buckets(counts)
    counts.map { |label, count| "#{label} #{count}人" }.join(" / ")
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
