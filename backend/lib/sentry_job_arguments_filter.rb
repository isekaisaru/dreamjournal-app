# Sentry へ送るイベントから Active Job の引数を落とす。
#
# 【なぜ必要か】
# sentry-rails の ActiveJob 連携は、ジョブが例外を投げたとき
#   extra: { active_job:, arguments:, scheduled_at:, job_id:, provider_job_id:, locale: }
# を付けて capture_exception する
# （sentry-rails 6.6.2 / lib/sentry/rails/active_job.rb の sentry_context）。
#
# ActionMailer::MailDeliveryJob の arguments には、パスワード再設定・
# メールアドレス確認の「生トークン」がそのまま入る。
#   ["UserMailer", "password_reset", "deliver_now", { args: [GlobalID, "<生トークン>"] }]
#
# production.rb の `config.active_job.log_arguments = false` は Rails の
# LogSubscriber にしか効かないため、Sentry へ送られる経路は塞げない。
# さらに raise_delivery_errors = true（メール送信失敗を検知するための設定）に
# より、送信失敗のたびにこの経路が発火する。そこでここで落とす。
#
# 【設計方針】
# - Active Job 由来と判断できる extra のときだけ触る（無関係な extra は壊さない）
# - arguments は削除ではなくマスクする。「引数があった」事実は残るので、
#   調査時に「引数なしのジョブ」と区別できる
# - ジョブクラス名・job_id・provider_job_id・queue・例外・スタックトレースは残す
# - 文字列キー / シンボルキー / ネストのどれでも落とせるようにする
# - extra が nil や想定外の型でも例外を出さない（フィルタ都合で送信を壊さない）
# - イベント全体をログへ出力しない（それ自体が漏洩になるため）
module SentryJobArgumentsFilter
  REDACTED = '[FILTERED]'

  # 落とす対象のキー名（文字列比較するのでシンボル/文字列どちらでも一致する）
  ARGUMENT_KEY_NAMES = %w[arguments].freeze

  # 「この extra は Active Job 由来」と判断するための目印。
  # これが無い extra には触らない（無関係な情報を消さないため）。
  ACTIVE_JOB_MARKER_KEYS = %w[active_job job_id provider_job_id].freeze

  # 異常に深い/循環した構造で無限に潜らないための上限
  MAX_DEPTH = 5

  # before_send から呼ばれる。必ず event を返す（nil を返すと送信自体が消える）。
  def self.call(event)
    extra = event.respond_to?(:extra) ? event.extra : nil
    return event unless extra.is_a?(Hash)
    return event unless active_job_extra?(extra)

    event.extra = redact(extra, 0)
    event
  rescue StandardError
    # フィルタ自身の失敗で Sentry 送信を壊さない。
    # ここで event の中身をログに出すと本末転倒なので、何も出力しない。
    event
  end

  # extra が Active Job 由来かどうか（トップレベルの目印だけで判断する）
  def self.active_job_extra?(hash)
    hash.any? { |key, _value| ACTIVE_JOB_MARKER_KEYS.include?(key.to_s) }
  end

  # arguments キーの値をマスクした新しい構造を返す（元の Hash は壊さない）
  def self.redact(value, depth)
    return value if depth > MAX_DEPTH

    case value
    when Hash
      value.each_with_object({}) do |(key, nested), result|
        result[key] =
          if ARGUMENT_KEY_NAMES.include?(key.to_s)
            REDACTED
          else
            redact(nested, depth + 1)
          end
      end
    when Array
      value.map { |element| redact(element, depth + 1) }
    else
      value
    end
  end
end
