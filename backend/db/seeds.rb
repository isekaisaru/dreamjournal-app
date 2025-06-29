# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

['嬉しい', '楽しい', '悲しい', '怒り', '不安', '怖い', '不思議', '感動的'].each do |emotion_name|
  Emotion.find_or_create_by!(name: emotion_name)
end

puts "Seeding of emotions completed."
