class DreamsController < ApplicationController
  before_action :set_dream_and_authorize_user, only: [:show, :update, :destroy, :analyze, :analysis, :generate_image]
  before_action :check_trial_analysis_limit, only: [:analyze, :preview_analysis]
  before_action :check_monthly_image_limit, only: [:generate_image]

  TRIAL_ANALYSIS_LIMIT = 3   # トライアルユーザーの分析回数上限
  IMAGE_MONTHLY_LIMIT   = 30 # 全ユーザー共通の画像生成月次上限
  

  # GET /dreams
  def index
    # N+1問題を解消し、軽量化。
    # 感情タグはanalysis_jsonに含まれているため、emotionsテーブルの結合(N+1)は行わない...
    # -> 修正: 手動記録のタグが表示されないため、emotionsを含めるように変更。
    initial_scope = current_user.dreams.order(created_at: :desc)
    filter_params = params.permit(:query, :start_date, :end_date, emotion_ids: [])
    @dreams = DreamFilterQuery.new(initial_scope, filter_params).call.includes(:emotions)
    render json: @dreams.as_json(include: :emotions)
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

    current_user.increment!(:trial_analysis_count) if current_user.trial_user?

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
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      }
    )

    image_url = response.dig("data", 0, "url")

    unless image_url
      return render json: { error: "画像URLの取得に失敗しました" }, status: :unprocessable_entity
    end

    @dream.update!(generated_image_url: image_url)

    render json: { image_url: image_url }, status: :ok
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

    result = DreamAnalysisService.analyze(content)

    if result[:error]
      render json: { error: result[:error] }, status: :unprocessable_content
    else
      current_user.increment!(:trial_analysis_count) if current_user.trial_user?
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

    # トライアルユーザーの分析回数チェック
    def check_trial_analysis_limit
      return unless current_user.trial_user?
      return if action_name == "analyze" && cached_analysis_request?

      if current_user.trial_analysis_count >= TRIAL_ANALYSIS_LIMIT
        render json: {
          error: "トライアルユーザーの分析上限（#{TRIAL_ANALYSIS_LIMIT}回）に達しました。アカウント登録すると無制限に分析できます。",
          limit_reached: true
        }, status: :forbidden
      end
    end

    # 画像生成の月次上限チェック（全ユーザー共通）
    def check_monthly_image_limit
      count = current_user.dreams
        .where.not(generated_image_url: nil)
        .where("updated_at >= ?", Time.current.beginning_of_month)
        .count

      if count >= IMAGE_MONTHLY_LIMIT
        render json: {
          error: "今月の画像生成上限（#{IMAGE_MONTHLY_LIMIT}枚）に達しました。来月またお試しください。",
          limit_reached: true,
          monthly_image_count: count,
          monthly_image_limit: IMAGE_MONTHLY_LIMIT
        }, status: :forbidden
      end
    end

    def cached_analysis_request?
      @dream&.analysis_status == "done" && @dream.analysis_json.present?
    end

    def build_image_prompt(content, analysis)
      base = "A dreamy, whimsical illustration of a dream: #{content}"
      base += " The mood is: #{analysis}" if analysis.present?
      base += ". Soft watercolor style, gentle colors, child-friendly, peaceful atmosphere, no text."
      base.truncate(900)
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
