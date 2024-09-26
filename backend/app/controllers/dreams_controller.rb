class DreamsController < ApplicationController
  # ユーザー認証を行う
  before_action :authorize_request, only: [:create,:update, :destroy, :my_dreams]
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

  def my_dreams
    @dreams = @current_user.dreams
    render json: @dreams.as_json(only: [:id, :title, :description, :created_at])
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
end