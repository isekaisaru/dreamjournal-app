class User < ApplicationRecord
  FREE_ANALYSIS_MONTHLY_LIMIT = 10

  # パスワード認証機能を提供
  has_secure_password
  has_many :dreams, dependent: :destroy
  has_many :dream_image_generations, dependent: :destroy
  has_many :payments, dependent: :destroy
  has_many :subscriptions, dependent: :destroy

  AGE_GROUPS = %w[child_small child preteen teen adult].freeze
  ANALYSIS_TONES = %w[auto gentle_kids junior standard deep].freeze

  validates :age_group, inclusion: { in: AGE_GROUPS }
  validates :analysis_tone, inclusion: { in: ANALYSIS_TONES }

  # バリデーション
  validates :email, presence: true, uniqueness: true
  validates :username, presence: true, uniqueness: true
  # パスワードのチェックは、新しいユーザーを作るときか、
  # パスワードが変更されたときだけにするよ。
  # これで、パスワード以外の情報（例えばユーザー名）だけを変えるときにエラーが出なくなるんだ。
  validates :password, length: { minimum: 8 }, allow_nil: true
  validates :password,
    format: {
      with: /\A(?=.*[a-zA-Z])(?=.*\d).+\z/,
      message: "は英字と数字をそれぞれ1文字以上含む必要があります"
    },
    allow_nil: true

  # JWTトークンを生成する
  def generate_jwt
    AuthService.encode_token(self.id)
  end

  # パスワードリセット用の「秘密の合言葉」を作る能力
  def generate_password_reset_token
    # 他の人と絶対に被らない、ユニークな合言葉ができるまで作り続ける
    loop do
      token = SecureRandom.urlsafe_base64(32)
      break self.reset_password_token = token unless User.exists?(reset_password_token: token)
    end
    # 合言葉を作った時間を記録
    self.reset_password_sent_at = Time.current
    # データベースに保存！
    save!
  end

  # 合言葉が「まだ使えるか」をチェックする能力
  def password_reset_valid?
    # 合言葉があって、作られた時間も記録されていて、
    # さらに作られてから60分以内なら「有効」と判断する
    reset_password_token.present? &&
    reset_password_sent_at.present? &&
    reset_password_sent_at >= 60.minutes.ago
  end

  # 一度使った合言葉を「無効にする」能力
  def use_password_reset_token!
    # 合言葉と時間を消して、もう使えないようにする
    update!(reset_password_token: nil, reset_password_sent_at: nil)
  end

  def premium_active_subscription?
    subscriptions.where(status: Subscription::ACTIVE_STATUSES).exists?
  end

  def reset_monthly_analysis_count_if_needed!(now = Time.current)
    current_month = now.beginning_of_month
    return if monthly_analysis_count_reset_at.present? && monthly_analysis_count_reset_at >= current_month

    update!(
      monthly_analysis_count: 0,
      monthly_analysis_count_reset_at: current_month
    )
  end

  def increment_monthly_analysis_count!(now = Time.current)
    reset_monthly_analysis_count_if_needed!(now)
    increment!(:monthly_analysis_count)
  end

  # チェックと加算を1回の条件付き UPDATE にまとめて競合状態を防ぐ。
  # スロットを確保できた場合は true、上限到達で確保できなかった場合は false を返す。
  def reserve_monthly_analysis_slot!(now = Time.current)
    reset_monthly_analysis_count_if_needed!(now)
    updated = User.where(id: id)
      .where("monthly_analysis_count < ?", FREE_ANALYSIS_MONTHLY_LIMIT)
      .update_all("monthly_analysis_count = monthly_analysis_count + 1")
    reload
    updated > 0
  end
end
