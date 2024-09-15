class SessionsController < ApplicationController
  skip_before_action :authorize_request, only: [:create]
   def create
    user = User.find_by(email: params[:email])
    if user
      Rails.logger.info "User found: #{user.username}"
    else
      Rails.logger.warn "No user found with email: #{params[:email]}"
    end

    if user && user.authenticate(params[:password])
      token = encode_token({ user_id: user.id })
      render json: { user: user.as_json(only: [:id, :email, :username]), jwt:token }, status: :created
    else
      render json: { error: 'Invalid email or password'}, status: :unauthorized
    end
   end

   private

   def encode_token(payload)
     JWT.encode(payload, Rails.application.credentials.secret_key_base)
   end
end
