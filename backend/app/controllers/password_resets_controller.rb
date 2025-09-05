class PasswordResetsController < ApplicationController
  # 認証チェックをスキップする
  skip_before_action :authorize_request, only: [:create, :update]

  # POST /password_resets
  # パスワードリセットトークンを生成し、メールを送信する
  def create
    user = User.find_by(email: params[:email])

    if user
      user.generate_password_reset_token
      # deliver_later を使用してメール送信をバックグラウンドジョブで非同期に処理します。
      # これにより、APIのレスポンスが高速になります。
      UserMailer.password_reset(user).deliver_later
    end

    # ユーザーが存在するかどうかにかかわらず、常に同じメッセージを返すことで、
    # メールアドレスの存在を推測される攻撃（ユーザー列挙攻撃）を防ぎます。
    render json: { message: 'パスワードリセットの手順を記載したメールを送信しました。メールが届かない場合は、迷惑メールフォルダもご確認ください。' }, status: :ok
  end

  # PATCH /password_resets/:id
  # トークンを使用してパスワードを更新する
  def update
    user = User.find_by(reset_password_token: params[:id])

    if user&.password_reset_valid?
      if user.update(password_reset_params)
        user.use_password_reset_token!
        render json: { message: 'パスワードが正常に更新されました。' }, status: :ok
      else
        render json: { errors: user.errors.full_messages }, status: :unprocessable_content
      end
    else
      render json: { error: '無効または期限切れのトークンです。' }, status: :unprocessable_content
    end
  end

  private

  def password_reset_params
    # パスワードの確認入力も受け取るようにして、入力ミスを防ぎます。
    params.permit(:password, :password_confirmation)
  end
end
