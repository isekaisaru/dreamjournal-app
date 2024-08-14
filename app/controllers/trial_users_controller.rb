class TrialUsersController < ApplicationController
  def create
    user = User.create(trial_user: true)
    user.save(validate: false)
    render json: { user_id: user.id, token: JsonWebToken.encode(user_id: user.id)}, status: :created
  end
end