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
  # GET /dreams_by_month
  def dreams_by_month
    month = params[:month] # クエリパラメーターから月を取得

    if month.nil?
      return render json: { error: '月のパラメータが必要です。'}, status: :bad_request
    end

    # 月ごとの夢をフィルタリング
    filtered_dreams = current_user.dreams.where("to_char(created_at, 'YYYY-MM') = ?", month)

    # 取得した夢データを返す
    render json: filtered_dreams.as_json(only: [:id, :title, :content, :created_at])
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
