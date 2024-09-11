class DreamsController < ApplicationController
  # ユーザー認証を行う
  before_action :authorize, only: [:create,:update, :destroy, :my_dreams]
  #  指定した夢を取得する
  before_action :set_dream, only: [:show, :update, :destroy]
  # 正しいユーザーかどうか確認する
  before_action :correct_user, only: [:update, :destroy]
  

  # GET /dreams
  def index
    @dreams = Dream.all
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
    @dream = Dream.find(params[:id])
    render json: @dream.as_json(only: [:id, :title, :description, :created_at])
  end

  # POST /dreams
  def create
    @dream = Dream.new(dream_params)
    @dream.user_id = @user&.id || nil
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
    @dreams = @user.dreams
    render json: @dreams.as_json(only: [:id, :title, :description, :created_at])
  end

  private
   
    # 指定した夢を取得する
    def set_dream
      @dream = Dream.find(params[:id])
    rescue ActiveRecord::RecordNotFound => e
      render json: { errors: e.message }, status: :not_found
    end

    # 認可されたパラメーターを取得する
    def dream_params
      params.require(:dream).permit(:title, :description)
    end

    # 正しいユーザーかどうか確認する
    def correct_user
      @dream = @user.dreams.find_by(id: params[:id])
      Rails.logger.info "Current user ID: #{@user.id}"
      Rails.logger.info "Dream user ID: #{@dream&.user_id}"
    if @dream.nil?
      Rails.logger.warn "User #{@user.id} is not authorized to delete dream #{params[:id]}"
      render json: { error: "Not Authorized" }, status: :forbidden
    end
    end
end