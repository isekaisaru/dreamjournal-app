require 'openai'
class DreamsController < ApplicationController
  # ユーザー認証を行う
  before_action :authorize_request, only: [:create,:update, :destroy, :my_dreams, :dreams_by_month]
  #  指定した夢を取得する
  before_action :set_dream, only: [:show, :update, :destroy]
  # 正しいユーザーかどうか確認する
  before_action :correct_user, only: [:update, :destroy]
  

  # GET /dreams
  def index
    # 現在のユーザーの夢を取得
    @dreams = @current_user.dreams
    # クエリパラメーターが存在する場合、タイトルでフィルタリング
    if params[:query].present?
      @dreams = @dreams.where("title LIKE ?", "%#{params[:query]}%")
    end
    
    # 日付パラメーターが存在する場合、作成日でフィルタリング
    if params[:start_date].present? && params[:end_date].present?
      @dreams = @dreams.where(created_at: params[:start_date]..params[:end_date])
    end

    render json: @dreams.as_json(only: [:id, :title, :description, :created_at]) 
  end

  # GET /dreams/:id
  def show
    render json: @dream.as_json(only: [:id, :title, :description, :created_at])
  end

  # POST /dreams
  def create
    @dream = Dream.new(dream_params)
    @dream.user_id = @current_user&.id || nil
    if @dream.save
      render json: @dream, status: :created, location: @dream
    else
      render json: { errors: @dream.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /dreams/:id
  def update
    if @dream.update(dream_params)
      render json: @dream
    else
    render json: { errors: @dream.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # DELETE /dreams/:id
  def destroy
   if @dream.destroy
    Rails.logger.info "Dream deleted successfully."
    head :no_content
   else
    render json: @dream.errors, status: :unprocessable_entity
   end
  end
  # GET /dreams_by_month
  def dreams_by_month
    month = params[:month] # クエリパラメーターから月を取得

    if month.nil?
      return render json: { error: '月のパラメータが必要です。'}, status: :bad_request
    end

    # 月ごとの夢をフィルタリング
    filtered_dreams = @current_user.dreams.where("to_char(created_at, 'YYYY-MM') = ?", month)

    # 取得した夢データを返す
    render json: filtered_dreams.as_json(only: [:id, :title, :description, :created_at])
  end

  # GET /my_dreams
  def my_dreams
    @dreams = @current_user.dreams
    render json: @dreams.as_json(only: [:id, :title, :description, :created_at])
  end

  # POST /dreams/analyze
  def analyze
    dream_content = params[:content]&.strip

   # パラメータ検証
   if params[:content].nil? || params[:content].strip.blank?
    error_message = "夢の内容が空です。 パラメータ: #{params.inspect}"
    Rails.logger.error(error_message)
    render json: { error: error_message }, status: :bad_request
    return
   end
   begin
      $openai_client ||= OpenAI::Client.new(access_token: ENV.fetch('OPENAI_API_KEY'))
      client = $openai_client
   # OpenAI APIにリクエストを送信
    response = client.chat(
      parameters: {
        model: "gpt-3.5-turbo",
        messages: [
        { role: "system", content: "あなたは夢分析の専門家です。ユーザーの夢を解釈し、テーマや感情、考えらる意味について教えてください。" },
        { role: "user", content: dream_content }
        ],
        max_tokens: 1500
      }
    )
    # 分析結果を返す
    analysis = response&.dig("choices", 0, "message", "content")

    if analysis.present?
      render json: { analysis: analysis }, status: :ok
    else
      Rails.logger.error response.present? ? "Invalid response format #{response.inspect}" : "Response is nil or empty."
      render json: { error: "夢の分析に失敗しました。"}, status: :unprocessable_entity
    end
  # エラーハンドリング

   rescue StandardError => e
      log_error(e)
      render json: { error: "予期しないエラーが発生しました: #{e.message}" }, status: :internal_server_error
   end
  end

  private
   
    # 指定した夢を取得する
    def set_dream
      @dream = Dream.find_by(id: params[:id])
      unless @dream
       render json: { errors: 'Dream not found' }, status: :not_found
      end
    end

    # 認可されたパラメーターを取得する
    def dream_params
      params.require(:dream).permit(:title, :description)
    end

    # 正しいユーザーかどうか確認する
    def correct_user
     if @dream.user_id != @current_user.id
      Rails.logger.debug "current user ID: #{@current_user.id}"
      Rails.logger.debug "dream user ID: #{@dream.user_id}"
      Rails.logger.debug "User #{@current_user.id} is not authorized to access dream #{params[:id]}"
      render json: { error: " Not Authorized" }, status: :forbidden
     end
    end
    # エラーログを出力
    def log_error(error)
      Rails.logger.error "#{error.class}: #{error.message}"
      Rails.logger.error "Request Params: #{params.inspect}" if params.present?
      Rails.logger.error error.backtrace.join("\n") if error.respond_to?(:backtrace)
    end
end