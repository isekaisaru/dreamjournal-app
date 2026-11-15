require 'rails_helper'
require 'rake'

RSpec.describe 'rake usage:report' do
  # ほかの rake の spec と二重に読み込まないよう、このファイルだけを読む
  before(:all) do
    load Rails.root.join('lib/tasks/usage_report.rake') unless Rake::Task.task_defined?('usage:report')
  end

  def run_task(*args)
    task = Rake::Task['usage:report']
    task.reenable
    original = $stdout
    $stdout = StringIO.new
    task.invoke(*args)
    $stdout.string
  ensure
    $stdout = original
  end

  it '指定した月の集計を文章で出す' do
    user = create(:user)
    create(:ai_usage_log, user: user, feature: 'dream_analysis', created_at: Time.utc(2026, 11, 10, 3, 0))

    output = run_task('2026-11')

    expect(output).to include('2026-11', 'AIの利用回数')
    expect(output).not_to include(user.email)
  end

  it 'データベースに書き込まない' do
    create(:user)

    expect { run_task('2026-11') }.not_to(change { [User.count, AiUsageLog.count, Dream.count] })
  end
end
