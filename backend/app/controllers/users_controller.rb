class UsersController < ApplicationController
  before_action :authorize_request, except: [:register]
  before_action :set_user, only: [:destroy]

  # ユーザー登録
  def register
    begin
      result = AuthService.register(params[:user])

      unless result[:user] && result[:token]
        Rails.logger.error "ユーザー登録処理で必要な情報が不足しています"
        render json: { error: "ユーザー登録処理に失敗しました" }, status: :internal_server_error
        return
      end

      render json: { user: result[:user], token: result[:token] }, status: :created
    rescue AuthService::RegistrationError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end

  # ユーザー削除
  def destroy
    if @user == current_user
      if @user.destroy
        render json: { message: "ユーザーが正常に削除されました" }, status: :ok
      else
        render json: { error: "ユーザーの削除に失敗しました。" }, status: :unprocessable_entity
      end
    else
      render json: { error: "許可されていない操作です。" }, status: :unauthorized
    end
  end

  private

  # 削除対象のユーザーをセット
  def set_user
    @user = User.find(params[:id]) # params[:id] からユーザーを取得
  rescue ActiveRecord::RecordNotFound
    render json: { error: "ユーザーが見つかりません" }, status: :not_found
  end
end