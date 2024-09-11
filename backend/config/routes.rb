Rails.application.routes.draw do
    resources :dreams, only: [:index, :show, :create, :update, :destroy]
    get 'my_dreams', to: 'dreams#my_dreams'
    post 'login', to: 'sessions#create'
    post 'register', to: 'users#register'
    post 'trial_users', to: 'trial_users#create'

    post 'auth/verify', to: 'auth#verify'
end