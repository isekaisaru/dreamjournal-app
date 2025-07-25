class EmotionsController < ApplicationController
  skip_before_action :authorize_request, only: [:index]
  def index
    @emotions = Emotion.all
    render json: @emotions
  end
end