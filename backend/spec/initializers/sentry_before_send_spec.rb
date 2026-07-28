require 'rails_helper'

# Sentry へ送るイベントに、パスワード再設定・メールアドレス確認の
# トークンが混ざらないことを守る回帰テスト。
#
# ここでは「テスト専用の別実装」ではなく、
#   - 実際の Sentry::ErrorEvent
#   - config/initializers/sentry.rb で実際に登録された before_send
#   - 実際のシリアライズ（to_json_compatible）
# を使う。フィルタを外したり before_send の登録を消したりすれば落ちる。
RSpec.describe 'Sentry before_send によるジョブ引数のマスク' do
  # 本物のトークンは使わない。混入検知用の合成マーカー。
  SYNTHETIC_MARKER = 'SYNTHETIC_PASSWORD_RESET_TOKEN_DO_NOT_LEAK'.freeze

  # test は enabled_environments に含まれないため、そのままだと
  # event_from_exception が nil を返す。イベントを作れるよう一時的に許可し、
  # 必ず元へ戻す（他のテストへ影響させない）。
  around do |example|
    original_environments = Sentry.configuration.enabled_environments
    Sentry.configuration.enabled_environments = original_environments + ['test']
    example.run
  ensure
    Sentry.configuration.enabled_environments = original_environments
  end

  # 実際に登録されている before_send（初期化子で設定されたもの）
  let(:before_send) { Sentry.configuration.before_send }

  let(:delivery_error) do
    begin
      raise Net::SMTPAuthenticationError, '535 authentication failed'
    rescue StandardError => e
      e
    end
  end

  # sentry-rails 6.6.2 の sentry_context(job) と同じ形。
  # ActionMailer::MailDeliveryJob の arguments には生トークンが入る。
  let(:active_job_extra) do
    {
      active_job: 'ActionMailer::MailDeliveryJob',
      arguments: [
        'UserMailer',
        'password_reset',
        'deliver_now',
        { args: ['gid://app/User/1', SYNTHETIC_MARKER] }
      ],
      scheduled_at: nil,
      job_id: 'job-id-for-spec',
      provider_job_id: nil,
      locale: 'en'
    }
  end

  def build_event(extra:)
    event = Sentry.get_current_client.event_from_exception(delivery_error)
    event.extra = extra
    event.tags = { job_id: 'job-id-for-spec' }
    event
  end

  it 'before_send が登録されている（未設定なら素通りしてしまう）' do
    expect(before_send).to respond_to(:call)
  end

  context 'メールジョブの例外イベント' do
    let(:filtered) { before_send.call(build_event(extra: active_job_extra), {}) }
    let(:serialized) { filtered.to_json_compatible.to_s }

    it 'シリアライズ結果に合成マーカーが残らない' do
      expect(serialized).not_to include(SYNTHETIC_MARKER)
    end

    it 'arguments がマスクされている' do
      expect(filtered.extra[:arguments]).to eq(SentryJobArgumentsFilter::REDACTED)
    end

    it 'ジョブクラス名は残る（調査に必要）' do
      expect(filtered.extra[:active_job]).to eq('ActionMailer::MailDeliveryJob')
      expect(serialized).to include('ActionMailer::MailDeliveryJob')
    end

    it 'Job ID は残る' do
      expect(filtered.extra[:job_id]).to eq('job-id-for-spec')
      expect(serialized).to include('job-id-for-spec')
    end

    it '例外情報（クラス・メッセージ）は残る' do
      expect(serialized).to include('SMTPAuthenticationError')
      expect(serialized).to include('535 authentication failed')
    end

    it 'ジョブ引数以外の項目は消さない' do
      expect(filtered.extra).to include(:scheduled_at, :provider_job_id, :locale)
    end

    it 'イベント自体は必ず返る（nilを返すと送信が消える）' do
      expect(filtered).to be_a(Sentry::ErrorEvent)
    end
  end

  context 'キーの表記ゆれ・ネスト' do
    it '文字列キーの arguments もマスクする' do
      extra = { 'active_job' => 'ActionMailer::MailDeliveryJob',
                'arguments' => [SYNTHETIC_MARKER],
                'job_id' => 'job-id-for-spec' }

      filtered = before_send.call(build_event(extra: extra), {})

      expect(filtered.to_json_compatible.to_s).not_to include(SYNTHETIC_MARKER)
    end

    it 'ネストした arguments もマスクする' do
      extra = { active_job: 'ActionMailer::MailDeliveryJob',
                job_id: 'job-id-for-spec',
                wrapped: { arguments: [{ args: [SYNTHETIC_MARKER] }] } }

      filtered = before_send.call(build_event(extra: extra), {})

      expect(filtered.to_json_compatible.to_s).not_to include(SYNTHETIC_MARKER)
    end
  end

  context 'Active Job 以外のイベント' do
    it '無関係な extra は変更しない' do
      extra = { request_id: 'req-1', arguments: 'この arguments は残す' }

      filtered = before_send.call(build_event(extra: extra), {})

      # active_job / job_id の目印が無いので触らない
      expect(filtered.extra[:arguments]).to eq('この arguments は残す')
    end
  end

  context '想定外の入力でも壊れない' do
    it 'extra が nil でも例外を出さずイベントを返す' do
      event = build_event(extra: nil)

      expect { before_send.call(event, {}) }.not_to raise_error
      expect(before_send.call(event, {})).to be_a(Sentry::ErrorEvent)
    end

    it 'extra が Hash でなくても例外を出さない' do
      event = build_event(extra: nil)
      allow(event).to receive(:extra).and_return('unexpected string')

      expect { before_send.call(event, {}) }.not_to raise_error
    end
  end
end
