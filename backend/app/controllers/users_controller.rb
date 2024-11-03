class UsersController < ApplicationController
  before_action :authorize_request
  before_action :set_user, only: [:destroy]
  

  # ユーザー登録
  def register
    puts params.inspect
    @user = User.new(user_params)
    if @user.save
      token = encode_token({ user_id: @user.id })
      render json: { user: @user, token: token }, status: :created
    else
      render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  # ユーザー削除
  def destroy
    if @user == current_user
      if @user.destroy
       render json: { message: "ユーザーが正常に削除されました" }, status: :ok
      else
        render json: { errors: "ユーザーの削除に失敗しました。" }, status: :unprocessable_entity
      end
    else
      render json: { errors: "許可されていない操作です。" }, status: :unauthorized
    end
  end

  private

  # 削除対象のユーザーをセット
  def set_user
    @user = User.find(params[:id]) # params[:id] からユーザーを取得
  rescue ActiveRecord::RecordNotFound
    render json: { errors: "ユーザーが見つかりません" }, status: :not_found
  end

  # ユーザーの登録パラメータ
  def user_params
    params.require(:user).permit(:email, :username, :password, :password_confirmation)
  end

end