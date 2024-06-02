class DreamsController < ApplicationController
  before_action :authorize, only: [:create,:update, :destroy]
  before_action :set_dream, only: [:show, :update, :destroy]
  before_action :correct_user, only: [:update, :destroy]
  

  # GET /dreams
  def index
    @dreams = Dream.all
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

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_dream
      @dream = Dream.find(params[:id])
    end

    # Only allow a trusted parameter "white list" through.
    def dream_params
      params.require(:dream).permit(:title, :description)
    end

    #Ensure the current user is the owner of the dream
    def correct_user
      @dream = @user.dreams.find_by(id: params[:id])
      render json: { error: "Not Authorized" }, status: :forbidden if @dream.nil?
    end
end