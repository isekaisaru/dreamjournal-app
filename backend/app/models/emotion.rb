class Emotion < ApplicationRecord
  has_many :dream_emotions, dependent: :destroy
  has_many :dreams, through: :dream_emotions
end
