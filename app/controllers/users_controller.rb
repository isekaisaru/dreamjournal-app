class UsersController < ApplicationController
  def register
    puts params.inspect
    @user = User.new(user_params)
    if @user.save
      token = encode_token({ user_id: @user.id })
      render json: { user: @user, token: token }, status: :created
    else
      puts @user.errors.full_messages
      render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.permit(:email, :username, :password, :password_confirmation)
  end

  def encode_token(payload)
    JWT.encode(payload, 'your_secret_key')
  end
end