Rails.application.routes.draw do
    resources :dreams, only: [:index, :show, :create, :update, :destroy] do
        member do
          post :analyze
        end
        collection do
            get  :my_dreams # 自分の夢を取得
            get  :by_month
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