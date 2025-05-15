class AuthController < ApplicationController
  skip_before_action :authorize_request, only: [:login, :refresh, :logout, :verify] # verify も認証不要にする

  # ユーザーのログイン
  def login
    begin
      result = AuthService.login(params[:email], params[:password])


      Rails.logger.debug "生成されたトークン: #{result[:access_token]}" if Rails.env.development?
      Rails.logger.debug "生成されたリフレッシュトークン: #{result[:refresh_token]}" if Rails.env.development?

      unless result[:user] && result[:access_token] && result[:refresh_token]
        Rails.logger.error "ログイン処理で必要な情報が不足しています"
        render json: { error: "ログイン処理に失敗しました" }, status: :internal_server_error
        return
      end

      render json: {
        access_token: result[:access_token],
        refresh_token: result[:refresh_token],
        user: result[:user].as_json(only: [:id, :email, :username])
      }, status: :ok
    rescue AuthService::InvalidCredentialsError => e
      render json: { error: e.message }, status: :unauthorized
    rescue StandardError => e # その他の予期せぬエラー
      Rails.logger.error "ログイン処理中に予期せぬエラーが発生: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: 'ログイン処理中にエラーが発生しました' }, status: :internal_server_error
    end
  end

  # 現在のユーザーを返す
  def me
    render json: { user: @current_user.as_json(only: [:id, :email, :username]) }, status: :ok
  end

  # トークンをリフレッシュする
  def refresh
    # リクエストボディやパラメータからリフレッシュトークンを取得
    refresh_token = params[:refresh_token]

    Rails.logger.info "受け取ったリフレッシュトークン: #{refresh_token.present? ? '[FILTERED]' : '[なし]'}" if Rails.env.development?
    if refresh_token.nil?
      Rails.logger.warn "リフレッシュトークンがリクエストに含まれていません"
      render json: { error: "リフレッシュトークンがありません" }, status: :unauthorized
      return
    end

    begin
      result = AuthService.refresh_token(refresh_token)
      Rails.logger.info "新しいアクセストークンを発行: #{result[:access_token]}" if Rails.env.development?
      # 新しいアクセストークンとリフレッシュトークンを返す
      render json: {
        access_token: result[:access_token],
        refresh_token: result[:refresh_token] # 新しいリフレッシュトークンも返す
      }, status: :ok
    rescue AuthService::InvalidRefreshTokenError => e
      Rails.logger.warn "無効なリフレッシュトークン: #{e.message}"
      render json: { error: e.message }, status: :unauthorized
    rescue StandardError => e # その他の予期せぬエラー
      Rails.logger.error "トークンリフレッシュ中に予期せぬエラーが発生: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: 'トークンリフレッシュ中にエラーが発生しました' }, status: :internal_server_error
    end
  end

  # ログアウト
  # リフレッシュトークンを受け取り、それを無効化する方式に変更
  def logout
    refresh_token = params[:refresh_token] # リクエストボディやパラメータから取得

    unless refresh_token
      Rails.logger.warn "ログアウトリクエストにリフレッシュトークンが含まれていません"
      render json: { error: "ログアウトにはリフレッシュトークンが必要です" }, status: :bad_request # 400 Bad Request
      return
    end

    begin
      # リフレッシュトークンを使ってユーザーを検索
      user = AuthService.find_user_by_refresh_token(refresh_token)
      # バリデーションとコールバックをスキップしてリフレッシュトークンのみを無効化
      user.update_column(:refresh_token, nil)
      render json: { message: "ログアウトしました" }, status: :ok
    rescue AuthService::InvalidRefreshTokenError => e
      # 無効なリフレッシュトークンが指定された場合 (既にログアウト済み、または不正なトークン)
      render json: { error: "無効なリフレッシュトークンです。ログアウトできませんでした。" }, status: :unauthorized
    rescue ActiveRecord::RecordInvalid => e # update_column では通常発生しないが、万が一のため
      Rails.logger.error "ログアウト処理中のDB更新に失敗: #{e.message}"
      render json: { error: 'ログアウト処理中にデータベースエラーが発生しました' }, status: :internal_server_error
    rescue StandardError => e # その他の予期せぬエラー
      Rails.logger.error "ログアウト処理中に予期せぬエラーが発生: #{e.message}\n#{e.backtrace.join("\n")}"
      render json: { error: 'ログアウト処理中にエラーが発生しました' }, status: :internal_server_error
    end
  end

  # トークンの検証
  def verify
    header = request.headers['Authorization']
    return render json: { error: 'Authorization ヘッダーが必要です。'}, status: :bad_request unless header

    token = header.split(' ').last
    decoded = AuthService.decode_token(token)

    if decoded.nil?
      Rails.logger.warn "トークンのデコードに失敗しました (nil)"
      render json: { error: 'トークンの解析に失敗しました。トークンが不正です。'}, status: :unauthorized
      return
    end

    unless decoded.is_a?(Hash)
      Rails.logger.warn "無効なトークン: #{decoded.inspect}"
      render json: { error: '無効なトークンです。トークンの形式が正しくありません。'}, status: :unauthorized
      return
    end
    if decoded['user_id']
      user = User.find_by(id: decoded['user_id'])
      if user
        render json: { message: 'トークンは有効です。', user: user.as_json(only: [:id, :email, :username]) }, status: :ok
      else
        Rails.logger.warn "トークンは有効だが、該当ユーザーが見つかりません: #{decoded['user_id']}"
        render json: { error: '指定されたユーザーIDのユーザーが見つかりません。'}, status: :unauthorized
      end
    else
      Rails.logger.warn "無効なトークン: #{token}"
      render json: { error: '無効なトークンです。トークンにユーザーIDが含まれていません。'}, status: :unauthorized
    end
  rescue StandardError => e # その他の予期せぬエラー
    Rails.logger.error "トークン検証中に予期せぬエラーが発生: #{e.message}\n#{e.backtrace.join("\n")}"
    render json: { error: 'トークン検証中にエラーが発生しました' }, status: :internal_server_error
  end
end
