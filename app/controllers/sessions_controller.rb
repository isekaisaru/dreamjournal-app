class SessionsController < ApplicationController
   def create

    user = User.find_by(email: params[:email])

    if user && user.authenticate(params[:password])
      token = encode_token({ user_id: user.id })
      render json: { user: user, jwt: token }, status: :created
    else
      render json: { error: 'Invalid email or password'}, status: :unauthorized
    end
   end
end
