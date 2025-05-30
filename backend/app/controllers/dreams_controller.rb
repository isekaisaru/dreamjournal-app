class DreamsController < ApplicationController
  before_action :set_dream_and_authorize_user, only: [:show, :update, :destroy, :analyze]
  

  # GET /dreams
  def index
    if current_user.nil?
      Rails.logger.warn "DreamsController#index: current_user が nil です。"
      render json: { error: "認証されたユーザーがいません" }, status: :unauthorized
      return
    end
    # 現在のユーザーの夢を取得
    @dreams = current_user.dreams
    # クエリパラメーターが存在する場合、タイトルでフィルタリング
    if params[:query].present?
      @dreams = @dreams.where("title LIKE ?", "%#{params[:query]}%")
    end
    
    # 日付パラメーターが存在する場合、作成日でフィルタリング
    if params[:start_date].present? && params[:end_date].present?
      @dreams = @dreams.where(created_at: params[:start_date]..params[:end_date])
    end

    render json: @dreams.as_json(only: [:id, :title,:created_at]) 
  end

  # GET /dreams/:id
  def show
    render json: @dream.as_json(only: [:id, :title, :created_at, :content])
  end

  # POST /dreams
  def create
    @dream = current_user.dreams.build(dream_params)
    if @dream.save
      render json: @dream, status: :created, location: @dream
    else
      render json: { error: @dream.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /dreams/:id
  def update
    if @dream.update(dream_params)
      render json: @dream
    else
      render json: { error: @dream.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /dreams/:id
  def destroy
    if @dream.destroy
      Rails.logger.info "Dream deleted successfully."
      head :no_content
    else
      render json: { error: @dream.errors.full_messages }, status: :unprocessable_entity
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
  # GET /my_dreams
  def my_dreams
    @dreams = current_user.dreams
    render json: @dreams.as_json(only: [:id, :title, :content, :created_at])
  end

  # POST /dreams/analyze
  def analyze
    Rails.logger.info "DreamsController#analyze called for dream ID: #{@dream.id}" if Rails.env.development?

    unless @dream.content.present?
      return render json: { error: "分析対象の夢の内容がありません。" }, status: :unprocessable_entity
    end

    result = DreamAnalysisService.analyze(@dream.content)

    if result[:analysis]
      render json: { analysis: result[:analysis] }, status: :ok
    else
      error_message = result[:error] || "分析処理中に不明なエラーが発生しました。"
      render json: { error: error_message }, status: :unprocessable_entity
    end
  end

  private
   
    # 認可されたパラメーターを取得する
    def dream_params
      params.require(:dream).permit(:title, :content)
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
