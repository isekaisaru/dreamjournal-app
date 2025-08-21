class UsersController < ApplicationController
  # ユーザー登録以外のアクションで認証が必要な場合は authorize_request を有効にする
  skip_before_action :authorize_request, only: [:register] # register アクションは認証不要
  before_action :set_user, only: [:destroy]

  # ユーザー登録
  # POST /users (RESTful な命名規則に合わせるのが一般的)
  def register
    begin
      # Strong Parameters を使用して安全にパラメータを受け取る
      result = AuthService.register(user_params)

      # AuthService.register は { access_token:, refresh_token:, user: } を返す
      unless result[:user] && result[:access_token] && result[:refresh_token]
        Rails.logger.error "ユーザー登録処理で AuthService から必要な情報が返されませんでした: #{result.inspect}"
        render json: { error: "ユーザー登録処理に失敗しました" }, status: :internal_server_error
        return
      end

      # ログイン時と同様にCookieを設定
      set_token_cookies(result[:access_token], result[:refresh_token])
      render json: { user: result[:user].as_json(only: [:id, :email, :username]) }, status: :created
    rescue AuthService::RegistrationError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end

  # ユーザー削除
  def destroy
    # 削除対象は常に現在のユーザーに限定する
    if current_user.destroy
      # ログアウト処理も忘れずに行う
      cookies.delete(:access_token)
      cookies.delete(:refresh_token, path: '/')
      render json: { message: "ユーザーアカウントが正常に削除されました" }, status: :ok
    else
      render json: { error: "許可されていない操作です。" }, status: :unauthorized
    end
  end

  private

  # Strong Parameters: 受け取るパラメータを制限する
  def user_params
    # params[:user] が存在することを期待する
    params.require(:user).permit(:username, :email, :password, :password_confirmation)
  end

  # 削除対象のユーザーをセット
  def set_user
    # authorize_request が @current_user をセットしている前提
    @user = User.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "ユーザーが見つかりません" }, status: :not_found
  end
end