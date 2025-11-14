class DreamsController < ApplicationController
  before_action :set_dream_and_authorize_user, only: [:show, :update, :destroy, :analyze, :analysis]
  

  # GET /dreams
  def index
    # DreamFilterQueryを使用して、フィルタリングとソートを一元管理
    initial_scope = current_user.dreams.order(created_at: :desc)
    filter_params = params.permit(:query, :start_date, :end_date, emotion_ids: [])
    @dreams = DreamFilterQuery.new(initial_scope, filter_params).call
    # my_dreamsと同様に、感情(emotions)も一緒に返す
    render json: @dreams, include: [:emotions]
  end

  # GET /dreams/:id
  def show
    render json: @dream.as_json(only: [:id, :title, :created_at, :content])
  end

  # POST /dreams
  def create
    # 音声ファイルがあるかどうかで処理を分岐
    if params[:dream][:audio].present?
      @dream = current_user.dreams.build(title: "音声入力された夢 #{Time.current.strftime('%Y-%m-%d %H:%M')}")
      @dream.audio.attach(params[:dream][:audio])
    else
      @dream = current_user.dreams.build(dream_params)
    end

    if @dream.save
      render json: @dream, status: :created, location: @dream
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
      render json: @dream
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
      @dreams = current_user.dreams.where(created_at: start_date..end_date).order(created_at: :desc)
      render json: @dreams.as_json(only: [:id, :title, :content, :created_at])
    rescue ArgumentError, TypeError
      render json: { error: "無効な日付フォーマットです。YYYY-MM 形式で指定してください。" }, status: :bad_request
    end
  end

  # POST /dreams/:id/analyze
  # このアクションは分析ジョブをキューに入れるだけです。
  def analyze
    Rails.logger.info "DreamsController#analyze called for dream ID: #{@dream.id}" if Rails.env.development?

    unless @dream.content.present?
      return render json: { error: "分析対象の夢の内容がありません。" }, status: :unprocessable_content
    end
    
    # 音声ファイルがあり、まだテキストがない場合は音声分析ジョブを起動
    if @dream.audio.attached? && @dream.content.blank?
      @dream.start_analysis!
      AnalyzeAudioDreamJob.perform_later(@dream.id)
      return render json: { message: '音声夢の分析リクエストを受け付けました。' }, status: :accepted, location: analysis_dream_url(@dream)
    end

    # 同じ夢に対する複数の分析リクエストをガード
    if @dream.analysis_pending?
      return render json: { message: 'すでに解析中です。' }, status: :accepted, location: analysis_dream_url(@dream)
    end
    
    @dream.start_analysis! # モデルのメソッドでステータスを 'pending' に
    AnalyzeDreamJob.perform_later(@dream.id) # ジョブをIDで非同期実行
    
    render json: { message: '夢の分析リクエストを受け付けました。' },
           status: :accepted,
           location: analysis_dream_url(@dream) # ポーリング用のURLを返す
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

  private
   
    # 認可されたパラメーターを取得する
    def dream_params
      params.require(:dream).permit(:title, :content, :audio, emotion_ids: [])
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
