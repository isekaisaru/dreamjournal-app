class Dream < ApplicationRecord
  # 編集開始時の版番号が、保存時点の版番号と一致しない（他の保存が先に確定した）。
  class EditConflict < StandardError; end

  # 利用者が編集する項目。これらが変わる保存だけが edit_version を進める
  # （AIの分析結果・生成画像の保存では進めない）。
  USER_EDITABLE_ATTRIBUTES = %w[title content dream_profile_id emotion_ids].freeze

  # 音声の夢は、録音を受け取った時点では「音声記録 YYYY/MM/DD HH:MM」（日本時間）の仮の題名にし、
  # 書き起こしができたら、その冒頭を題名にする（利用者が題名を直していなければ）。
  AUDIO_TITLE_TIME_ZONE = "Asia/Tokyo".freeze
  AUDIO_PLACEHOLDER_TITLE_FORMAT = %r{\A音声記録 \d{4}/\d{2}/\d{2} \d{2}:\d{2}\z}
  TRANSCRIPT_TITLE_MAX_LENGTH = 20

  def self.audio_placeholder_title(time = Time.current)
    "音声記録 #{time.in_time_zone(AUDIO_TITLE_TIME_ZONE).strftime('%Y/%m/%d %H:%M')}"
  end

  def self.audio_placeholder_title?(title)
    AUDIO_PLACEHOLDER_TITLE_FORMAT.match?(title.to_s)
  end

  # 書き起こしの最初の文（句点・感嘆符・疑問符・改行まで）を題名にする。
  # 末尾の句点は外し、20文字を超えるときは20文字で切って「…」を付ける。中身が無ければ nil。
  def self.title_from_transcript(transcript)
    first = transcript.to_s
                      .split(/(?<=[。！？!?])|\R/)
                      .map { |sentence| sentence.strip.sub(/[。．.]+\z/, "").strip }
                      .find(&:present?)
    return nil if first.nil?

    first.length > TRANSCRIPT_TITLE_MAX_LENGTH ? "#{first[0, TRANSCRIPT_TITLE_MAX_LENGTH]}…" : first
  end

  belongs_to :user, optional: false
  belongs_to :dream_profile, optional: true
  has_many :dream_emotions, dependent: :destroy
  has_many :dream_image_generations, dependent: :destroy
  has_many :emotions, through: :dream_emotions
  has_one_attached :audio

  validates :title, presence: true, length: { maximum: 100 }
  validates :content, presence: true, length: { maximum: 1000 }
  validate :dream_profile_belongs_to_user, if: -> { dream_profile_id.present? }

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

  private

  def dream_profile_belongs_to_user
    return if dream_profile&.user_id == user_id
    errors.add(:dream_profile_id, "は自分のプロフィールを指定してください")
  end

  public

  # 利用者の編集を保存し、edit_version を1つ進める（感情タグだけの変更でも進める）。
  # 行ロックの中で最新の版と比較するため、同じ版から始めた保存は1件だけが成功する。
  # expected_version が nil の場合は比較しない（版番号を送らない旧クライアントの移行期間用）。
  # 成功で true、バリデーション失敗で false を返し、版の不一致では EditConflict を投げる。
  # 投げた時点の self は行ロックで再読込した最新の状態になっている。
  def apply_user_edit(attributes, expected_version:)
    # lock! は未保存の変更があると例外になるため、ロック後に代入する
    saved = with_lock do
      raise EditConflict if !expected_version.nil? && edit_version != expected_version

      assign_attributes(attributes) # emotion_ids= もこのトランザクション内でDBへ反映される
      self.edit_version += 1
      save || raise(ActiveRecord::Rollback)
    end
    saved == true
  end

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
