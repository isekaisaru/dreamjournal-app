class User < ApplicationRecord
  # パスワード認証機能を提供
  has_secure_password
  has_many :dreams, dependent: :destroy

  # バリデーション
  validates :email, presence: true, uniqueness: true
  validates :username, presence: true, uniqueness: true
  # パスワードのチェックは、新しいユーザーを作るときか、
  # パスワードが変更されたときだけにするよ。
  # これで、パスワード以外の情報（例えばユーザー名）だけを変えるときにエラーが出なくなるんだ。
  validates :password, length: { minimum: 6 }, allow_nil: true

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
end
