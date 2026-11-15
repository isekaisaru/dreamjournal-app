namespace :usage do
  desc "月ごとの利用状況（AIの回数・画像・夢の記録・概算の費用）を合計だけで表示する（読み取りだけ）。例: bin/rails \"usage:report[2026-11]\""
  task :report, [:year_month] => :environment do |_task, args|
    year_month = args[:year_month].presence || Time.current.in_time_zone(UsageReport::TIME_ZONE).strftime("%Y-%m")

    begin
      puts UsageReport.new(year_month: year_month).to_text
    rescue ArgumentError => e
      abort e.message
    end
  end
end
