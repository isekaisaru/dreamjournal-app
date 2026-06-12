class UsersController < ApplicationController
  # ユーザー登録以外のアクションで認証が必要な場合は authorize_request を有効にする
  skip_before_action :authorize_request, only: [:create] # 'register' から 'create' に変更
  before_action :set_user, only: [:destroy]

  # ユーザー登録
  # POST /auth/register (routes.rb で定義)
  def create
    result = nil
    error_response = nil

    ApplicationRecord.transaction do
      begin
        result = AuthService.register(user_params)

        unless result[:user] && result[:access_token] && result[:refresh_token]
          Rails.logger.error "ユーザー登録処理で AuthService から必要な情報が返されませんでした: #{result.inspect}"
          error_response = { body: { error: "ユーザー登録処理に失敗しました" }, status: :internal_server_error }
          raise ActiveRecord::Rollback
        end

        result[:user].dream_profiles.create!(
          name: "自分", avatar_emoji: "😴", color: "#6366f1",
          relationship: "self", active: true, position: 0
        )
      rescue AuthService::RegistrationError => e
        error_response = { body: { error: e.message }, status: :unprocessable_entity }
        raise ActiveRecord::Rollback
      rescue ActiveRecord::RecordInvalid => e
        Rails.logger.error "自分プロフィールの自動作成に失敗しました: #{e.message}"
        error_response = { body: { error: "ユーザー登録処理に失敗しました" }, status: :internal_server_error }
        raise ActiveRecord::Rollback
      end
    end

    if error_response
      render json: error_response[:body], status: error_response[:status]
    else
      set_token_cookies(result[:access_token], result[:refresh_token])
      render json: { user: result[:user].as_json(only: [:id, :email, :username, :premium, :age_group, :analysis_tone]) }, status: :created
    end
  end

  # ユーザー削除
  def destroy
    # 削除前に Stripe 側のサブスクを即時解約する。失敗したら削除を中断。
    begin
      SubscriptionCanceler.new(current_user).call
    rescue SubscriptionCanceler::CancellationError => e
      Rails.logger.error("[AccountDeletion] Stripe解約失敗 user_id=#{current_user.id}: #{e.message}")
      return render json: { error: "サブスクリプションの解約に失敗しました。時間をおいて再度お試しください。" },
                    status: :unprocessable_content
    end

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
