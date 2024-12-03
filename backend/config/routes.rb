Rails.application.routes.draw do
    resources :dreams, only: [:index, :show, :create, :update, :destroy] do
        collection do
            post :analyze # AI分析のエンドポイント
            get  :my_dreams # 自分の夢を取得
            get  :by_month  # 月ごとの夢を取得
        end
    end
    
    # 認証関連
    post 'auth/login', to: 'auth#login' # ログイン
    get  '/me', to: 'auth#me' # 現在のユーザーを取得
    post 'auth/verify', to: 'auth#verify' # トークンの検証
    post 'auth/refresh', to: 'auth#refresh' # トークンをリフレッシュ


    # ユーザー関連
    post '/register', to: 'users#register' # ユーザー登録
    resources :users, only: [:destroy]     # ユーザー削除
end