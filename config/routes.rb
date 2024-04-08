Rails.application.routes.draw do
   resources :dreams, only: [:index, :show, :create, :update, :destroy]
end