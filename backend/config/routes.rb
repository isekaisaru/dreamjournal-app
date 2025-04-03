Rails.application.routes.draw do
    resources :dreams, only: [:index, :show, :create, :update, :destroy] do
        collection do
            post :analyze # AI分析のエンドポイント
            get  :my_dreams # 自分の夢を取得
            get  :by_month  # 月ごとの夢を取得
        end
    end
    
    # 認証関連
    namespace :auth do
      post 'login'
      get 'me'
      post 'verify'
      post 'refresh'
      post 'logout'
    end


    # ユーザー関連
    post '/register', to: 'users#register' # ユーザー登録
    delete 'users/:id', to: 'users#destroy'    # ユーザー削除
end