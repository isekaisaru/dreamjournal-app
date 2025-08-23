module AuthHelpers
  # ユーザーをログインさせてCookieトークンを取得する
  def login_user(user)
    post '/auth/login', params: {
      email: user.email,
      password: 'password123'
    }, headers: { 'Content-Type' => 'application/json', 'HOST' => 'backend' }
    
    expect(response).to have_http_status(:ok)
    response.cookies['access_token']
  end

  # 認証ヘッダーを生成する
  def auth_headers(user)
    token = login_user(user)
    { 'Cookie' => "access_token=#{token}", 'HOST' => 'backend' }
  end

  # 認証済みユーザーとしてAPIリクエストを送信する
  def authenticated_get(path, user, params: {})
    get path, params: params, headers: auth_headers(user)
  end

  def authenticated_post(path, user, params: {})
    post path, params: params, headers: auth_headers(user).merge({ 'Content-Type' => 'application/json' })
  end

  def authenticated_put(path, user, params: {})
    put path, params: params, headers: auth_headers(user).merge({ 'Content-Type' => 'application/json' })
  end

  def authenticated_delete(path, user)
    delete path, headers: auth_headers(user)
  end
end