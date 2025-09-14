Rails.application.routes.draw do
  # 軽量ヘルスチェック（Docker HEALTHCHECK用）
  get "/health", to: proc { [200, {}, ["OK"]] }
  
  # 詳細ヘルスチェック（監視ツール用）
  get "/health/detailed", to: "health#detailed_check"

  resources :dreams, only: [:index, :show, :create, :update, :destroy] do
    member do
      post :analyze
      get :analysis
    end
    collection do
      get :my_dreams
      # /dreams/month/2023-05 のような形式でアクセス
      get 'month/:year_month', to: 'dreams#by_month_index', as: :by_month
    end
  end

  resources :emotions, only: [:index]

  # ユーザー関連
  # DELETE /users/:id
  resources :users, only: [:destroy]

  # 認証関連
  scope '/auth' do
    post 'login', to: 'auth#login'
    post 'logout', to: 'auth#logout'
    post 'refresh', to: 'auth#refresh'
    get 'me', to: 'auth#me'
    get 'verify', to: 'auth#verify'
    post 'register', to: 'users#create'
    post 'trial_login', to: 'trial_users#create'
  end

  # パスワードリセット関連
  resources :password_resets, only: [:create, :update]

  # 開発環境専用: パスワードリセットトークン取得用エンドポイント（E2E用）
  if Rails.env.development? || ENV['ENABLE_DEV_ENDPOINTS'] == 'true'
    get '/dev/password_resets/token', to: 'password_resets#dev_token'
  end
end
