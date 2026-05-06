class DreamsController < ApplicationController
  before_action :set_dream_and_authorize_user, only: [:show, :update, :destroy, :analyze, :analysis, :generate_image]
  before_action :check_analysis_limit, only: [:analyze, :preview_analysis]
  before_action :check_monthly_image_limit, only: [:generate_image]

  TRIAL_ANALYSIS_LIMIT = 3   # トライアルユーザーの分析回数上限
  IMAGE_MONTHLY_LIMIT   = 31 # 全ユーザー共通の画像生成月次上限
  FREE_ANALYSIS_MONTHLY_LIMIT = User::FREE_ANALYSIS_MONTHLY_LIMIT
  

  # GET /dreams
  def index
    # N+1問題を解消し、軽量化。
    # 感情タグはanalysis_jsonに含まれているため、emotionsテーブルの結合(N+1)は行わない...
    # -> 修正: 手動記録のタグが表示されないため、emotionsを含めるように変更。
    # generated_image_url は base64 で最大 1MB になるため一覧では SELECT 時点で除外する。
    # as_json(only:) だけでは ActiveRecord が SELECT * でロードするためメモリに乗る。
    # 詳細画面（show）でのみ返す。
    index_columns = %i[id title content created_at analysis_json analysis_status analyzed_at user_id]
    initial_scope = current_user.dreams.select(index_columns).order(created_at: :desc)
    filter_params = params.permit(:query, :start_date, :end_date, emotion_ids: [])
    @dreams = DreamFilterQuery.new(initial_scope, filter_params).call.includes(:emotions)
    render json: @dreams.as_json(
      only: index_columns - [:user_id],
      include: :emotions
    )
  end

  # GET /dreams/statuses?ids=1,2,3
  def statuses
    ids = params[:ids].to_s.split(",").map(&:to_i)
    # current_user の持つ夢だけを対象にする（セキュリティ）
    dreams = current_user.dreams.where(id: ids).select(:id, :analysis_status)
    
    # { "1": "done", "2": "pending" } の形式で返す
    status_map = dreams.each_with_object({}) do |dream, hash|
      hash[dream.id.to_s] = dream.analysis_status
    end

    render json: status_map
  end

  # GET /dreams/image_quota
  def image_quota
    used  = current_month_image_generation_count
    limit = IMAGE_MONTHLY_LIMIT
    render json: {
      used:      used,
      limit:     limit,
      remaining: [limit - used, 0].max
    }
  end

  # GET /dreams/:id
  def show
    render json: @dream.as_json(
      only: [:id, :title, :created_at, :content, :analysis_json, :analysis_status, :analyzed_at, :generated_image_url],
      include: :emotions
    )
  end

  # POST /dreams
  def create
    Rails.logger.info "DreamsController#create called"
    Rails.logger.info "Params: #{params.inspect}"
    
    # 音声ファイルがあるかどうかで処理を分岐
    if params[:dream][:audio].present?
      @dream = current_user.dreams.build(
        title: "音声入力された夢 #{Time.current.strftime('%Y-%m-%d %H:%M')}",
        content: "音声ファイルがアップロードされました。解析待ちです。"
      )
      @dream.audio.attach(params[:dream][:audio])
    else
      @dream = current_user.dreams.build(dream_params)
    end

    if @dream.save
      @dream.reload
      render json: @dream.as_json(include: :emotions), status: :created, location: @dream
    else
      render json: { error: @dream.errors.full_messages }, status: :unprocessable_content
    end
  end

  # PATCH/PUT /dreams/:id
  def update
    # 音声ファイルが添付された更新リクエストの場合
    if params[:dream][:audio].present?
      @dream.audio.attach(params[:dream][:audio])
      # ここでジョブを起動することも可能
    end
    if @dream.update(dream_params)
      @dream.reload
      render json: @dream.as_json(include: :emotions)
    else
      render json: { error: @dream.errors.full_messages }, status: :unprocessable_content
    end
  end

  # DELETE /dreams/:id
  def destroy
    if @dream.destroy
      Rails.logger.info "Dream deleted successfully."
      head :no_content
    else
      render json: { error: @dream.errors.full_messages }, status: :unprocessable_content
    end
  end
  # GET /dreams/month/:yaer_month
  def by_month_index
    year_month_str = params[:year_month]

    if year_month_str.blank?
      return render json: { error: 'year_month パラメータが必要です (例: /dreams/month/2025-05)' }, status: :bad_request
    end

    begin
      year, month = year_month_str.split('-').map(&:to_i)
      start_date = Date.new(year, month, 1).beginning_of_month
      end_date = Date.new(year, month, 1).end_of_month
      @dreams = current_user.dreams
                           .where(created_at: start_date..end_date)
                           .includes(:emotions)
                           .order(created_at: :desc)
      render json: @dreams.as_json(
        only: [:id, :title, :content, :created_at, :analysis_json, :analysis_status, :analyzed_at],
        include: :emotions
      )
    rescue ArgumentError, TypeError
      render json: { error: "無効な日付フォーマットです。YYYY-MM 形式で指定してください。" }, status: :bad_request
    end
  end

  # POST /dreams/:id/analyze
  # このアクションは分析ジョブをキューに入れるだけです。
  # POST /dreams/:id/analyze
  def analyze
    Rails.logger.info "DreamsController#analyze called for dream ID: #{@dream.id}"

    # 1. 夢の内容チェック
    unless @dream.content.present?
      return render json: {
        status: "failed",
        result: { error: "夢の内容がありません。分析できません。" }
      }, status: :unprocessable_content
    end

    # 2. 同じ夢に対する複数の分析リクエストをガード
    if @dream.analysis_pending?
      return render json: { message: 'すでに解析中です。' }, status: :accepted, location: analysis_dream_url(@dream)
    end

    # 3. 既に分析完了済みの場合はAPIを呼ばず既存結果を返す
    if @dream.analysis_status == "done" && @dream.analysis_json.present?
      return render json: {
        status: "done",
        result: @dream.analysis_json,
        analyzed_at: @dream.analyzed_at,
        cached: true
      }, status: :ok
    end

    @dream.update!(
      analysis_status: "pending",
      analyzed_at: nil,
      analysis_json: nil
    )

    increment_analysis_usage!

    # 3. 非同期ジョブをエンキュー
    AnalyzeDreamJob.perform_later(@dream.id)

    # 4. レスポンス (202 Accepted)
    render json: { status: "pending" }, status: :accepted, location: analysis_dream_url(@dream)
  end
  
  # GET /dreams/:id/analysis
  # このアクションは分析のステータスと結果を返します。
  def analysis
    render json: {
      status: @dream.analysis_status,
      result: @dream.analysis_json,
      analyzed_at: @dream.analyzed_at
    }, status: :ok
  end

  # POST /dreams/:id/generate_image
  # DALL-E 3 で夢のイメージ画像を生成し URL を保存する
  def generate_image
    unless $openai_client
      return render json: { error: "画像生成機能は現在利用できません" }, status: :service_unavailable
    end

    content = @dream.content.to_s.truncate(400)
    analysis = @dream.analysis_json&.dig("analysis").to_s.truncate(200)

    prompt = build_image_prompt(content, analysis)

    response = $openai_client.images.generate(
      parameters: {
        model: ENV["OPENAI_IMAGE_MODEL"].presence || "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium"
      }
    )

    # OpenAI Blob URLs are temporary. Prefer base64 when available so saved
    # dream images stay viewable after the upstream URL expires.
    b64 = response.dig("data", 0, "b64_json")
    image_url =
      if b64.present?
        "data:image/png;base64,#{b64}"
      else
        response.dig("data", 0, "url")
      end

    unless image_url
      return render json: { error: "画像URLの取得に失敗しました" }, status: :unprocessable_entity
    end

    generated_at = Time.current
    Dream.transaction do
      @dream.update!(generated_image_url: image_url, image_generated_at: generated_at)
      @dream.dream_image_generations.create!(user: current_user, generated_at: generated_at)
    end

    render json: { image_url: image_url }, status: :ok
  rescue Faraday::TimeoutError, Net::ReadTimeout, Net::OpenTimeout => e
    Rails.logger.error "[generate_image] Timeout for dream #{@dream.id}: #{e.message}"
    render json: { error: "画像の生成に時間がかかりすぎました。しばらく待ってからお試しください。" }, status: :gateway_timeout
  rescue OpenAI::Error => e
    Rails.logger.error "[generate_image] OpenAI error for dream #{@dream.id}: #{e.message}"
    render json: { error: "画像の生成に失敗しました。しばらく待ってからお試しください。" }, status: :unprocessable_entity
  rescue StandardError => e
    Rails.logger.error "[generate_image] Unexpected error for dream #{@dream.id}: #{e.message}"
    render json: { error: "画像の生成に失敗しました。" }, status: :internal_server_error
  end

  # POST /dreams/preview_analysis
  # DBに保存せずに分析のみ行い、結果を返します。
  def preview_analysis
    content = params[:content]
    if content.blank?
      return render json: { error: "ゆめの ないよう が ないよ" }, status: :unprocessable_content
    end

    result = DreamAnalysisService.analyze(
      content,
      age_group:     current_user.age_group,
      analysis_tone: current_user.analysis_tone
    )

    if result[:error]
      render json: { error: result[:error] }, status: :unprocessable_content
    else
      increment_analysis_usage!
      render json: result
    end
  end

  private
   
    # 認可されたパラメーターを取得する
    def dream_params
      params.require(:dream).permit(
        :title, 
        :content, 
        :audio, 
        :analysis_status,
        :analyzed_at,
        emotion_ids: [],
        analysis_json: [:analysis, :text, { emotion_tags: [] }]
      )
    end

    def check_analysis_limit
      return if current_user.premium?
      return if action_name == "analyze" && cached_analysis_request?

      if current_user.trial_user?
        return unless current_user.trial_analysis_count >= TRIAL_ANALYSIS_LIMIT

        render json: {
          error: "トライアルユーザーの分析上限（#{TRIAL_ANALYSIS_LIMIT}回）に達しました。アカウント登録すると無制限に分析できます。",
          limit_reached: true
        }, status: :forbidden
        return
      end

      unless current_user.reserve_monthly_analysis_slot!
        render json: {
          error: "無料プランのAI分析上限（#{FREE_ANALYSIS_MONTHLY_LIMIT}回/月）に達しました。プレミアム会員になると無制限で利用できます。",
          limit_reached: true,
          monthly_analysis_count: current_user.monthly_analysis_count,
          monthly_analysis_limit: FREE_ANALYSIS_MONTHLY_LIMIT
        }, status: :forbidden
      end
    end

    def increment_analysis_usage!
      return if current_user.premium?
      return unless current_user.trial_user?

      current_user.increment!(:trial_analysis_count)
    end

    # 画像生成の月次上限チェック（全ユーザー共通）
    def check_monthly_image_limit
      count = current_month_image_generation_count

      if count >= IMAGE_MONTHLY_LIMIT
        render json: {
          error: "今月の画像生成上限（#{IMAGE_MONTHLY_LIMIT}枚）に達しました。来月またお試しください。",
          limit_reached: true,
          monthly_image_count: count,
          monthly_image_limit: DreamsController::IMAGE_MONTHLY_LIMIT
        }, status: :forbidden
      end
    end

    def current_month_image_generation_count
      current_user.dream_image_generations.generated_in_month.count
    end

    def cached_analysis_request?
      @dream&.analysis_status == "done" && @dream.analysis_json.present?
    end

    def build_image_prompt(content, analysis)
      style = image_style_for_age_group(@current_user&.age_group)
      parts = []
      parts << "Create a beautiful, peaceful, and wonder-filled dream illustration for a children-friendly dream journal app. #{style}"
      parts << "Dream content: #{content.truncate(300)}"
      parts << "Emotional theme: #{analysis.truncate(100)}" if analysis.present?
      parts << "Focus the composition on ONE specific memorable detail from this dream — a unique object, person, landscape, or magical moment. Let the colors and lighting reflect the emotional mood of this exact dream rather than a generic dream template."
      parts << "Any dark, scary, or intense elements must be transformed into soft, symbolic, and poetic visual metaphors — never literal horror. The final image must feel safe, comforting, and age-appropriate. No threatening faces, no gore, no dark shadows. Mood: gentle and magical."
      parts << "Art style requirements: clean digital illustration only — flat or semi-flat, clear outlines, bright warm colors, simple readable composition that works well on a smartphone screen. Avoid: oil painting, painterly texture, heavy brush strokes, watercolor wash, impressionist or expressionist style, photo-realism."
      parts << "No text or letters."
      parts.join(" ").truncate(900)
    end

    def image_style_for_age_group(age_group)
      case age_group
      when "child_small", "child"
        "Clean digital illustration, soft pastel colors, simple rounded shapes, child-friendly and cheerful."
      when "preteen"
        "Clean digital illustration, colorful and vivid, slightly adventurous, friendly and energetic."
      when "teen"
        "Clean digital illustration, dynamic composition, vivid colors, cool and stylish dreamlike mood."
      when "adult"
        "Clean digital illustration, detailed but clear outlines, warm sophisticated tones, elegant and dreamlike."
      else
        "Clean digital illustration, soft warm colors, simple and clear composition, pleasant dreamlike mood."
      end
    end

    def set_dream_and_authorize_user
      @dream = Dream.find_by(id: params[:id])

      unless @dream
        render json: { error: '指定された夢が見つかりません' }, status: :not_found
        return
      end

      unless @dream.user_id == @current_user.id
        Rails.logger.warn "User #{@current_user.id} attemptec to access dream #{@dream.id} #{@dream.user_id}" if Rails.env.development?
        render json: { error: "この夢へのアクセス権限がありません" }, status: :forbidden
      end
    end
end
