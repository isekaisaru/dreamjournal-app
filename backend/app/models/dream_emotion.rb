class DreamEmotion < ApplicationRecord
  belongs_to :dream, optional: false
  belongs_to :emotion, optional: false
end
