Rails.application.routes.draw do
    resources :dreams, only: [:index, :show, :create, :update, :destroy]
    get 'my_dreams', to: 'dreams#my_dreams'
    get 'dreams/month/:month', to: 'dreams#dreams_by_month'
    get 'me', to: 'auth#me'
    post 'login', to: 'sessions#create'
    post 'register', to: 'users#register'
    post 'trial_users', to: 'trial_users#create'
    post 'auth/verify', to: 'auth#verify'
    resources :users, only: [:destroy]
end