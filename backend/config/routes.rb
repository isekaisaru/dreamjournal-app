Rails.application.routes.draw do
  # 軽量ヘルスチェック（Docker HEALTHCHECK用）
  get "/health", to: proc { [200, {}, ["OK"]] }
  
  # 詳細ヘルスチェック（監視ツール用）
  get "/health/detailed", to: "health#detailed_check"
    resources :dreams, only: [:index, :show, :create, :update, :destroy] do
        member do
          post :analyze
        end
        collection do
            get  :my_dreams # 自分の夢を取得
            get  'month/:year_month', to: 'dreams#by_month_index', as: :dreams_by_month
        end
    end
    resources :emotions, only: [:index]
    # 認証関連
    scope '/auth' do
      post 'login', to: 'auth#login'
      post 'register', to: 'users#register'  # ユーザー登録
      get 'me', to: 'auth#me'
      get 'verify', to: 'auth#verify'
      post 'refresh', to: 'auth#refresh'
      post 'logout', to: 'auth#logout'
    end
    delete 'users/:id', to: 'users#destroy'    # ユーザー削除
end