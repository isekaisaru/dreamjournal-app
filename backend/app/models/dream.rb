class Dream < ApplicationRecord
  belongs_to :user, optional: false
  has_many :dream_emotions, dependent: :destroy
  has_many :dream_image_generations, dependent: :destroy
  has_many :emotions, through: :dream_emotions
  has_one_attached :audio

  validates :title, presence: true, length: { maximum: 100 }
  validates :content, presence: true, length: { maximum: 1000 }

  # analysis_status カラムを enum として定義し、メソッド名の衝突を避けるためにプレフィックスを付けます
  enum :analysis_status, { pending: 'pending', done: 'done', failed: 'failed' }, prefix: :analysis

  # よく使うクエリパターンをスコープとして定義する
  # current_user.dreams.with_image のように使う
  scope :with_image, -> { where.not(generated_image_url: nil) }
  # 画像が今月生成 / 再生成された夢に絞り込む（最後の生成時刻ベース）
  scope :generated_in_month, ->(date = Time.current) {
    where(image_generated_at: date.beginning_of_month..date.end_of_month)
  }
  # dream.analysis_done? の代わりに、コレクションの絞り込みにも使える
  scope :analyzed, -> { where(analysis_status: 'done') }

  # 分析プロセスを開始するメソッド
  def start_analysis!
    update!(analysis_status: 'pending', analysis_json: nil, analyzed_at: nil)
  end

  # 分析が成功した際に呼び出すメソッド
  def mark_done!(payload)
    update!(analysis_status: 'done', analysis_json: payload, analyzed_at: Time.current)
  end

  # 分析が失敗した際に呼び出すメソッド
  def mark_failed!(message)
    update!(analysis_status: 'failed', analysis_json: { error: message }, analyzed_at: Time.current)
  end
end
