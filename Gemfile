source "https://rubygems.org"

ruby "3.3.0"

# Rails
gem "rails", "~> 7.0.0"

# PostgreSQL as the database
gem "pg", "~> 1.1"

# Puma as the web server
gem "puma", "~> 5.0"

# JavaScript with ESM import maps
gem "importmap-rails"

# Hotwire for modern web UIs
gem "turbo-rails"
gem "stimulus-rails"

# Building JSON APIs
gem "jbuilder"

# Add CORS to accept requests from different origins
gem 'rack-cors'

# JSON Web Tokens for authentication
gem 'jwt'

# Use bcrypt for secure password hashing
gem 'bcrypt', '~> 3.1.7'

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]

# Reduces boot times through caching
gem "bootsnap", require: false

group :development, :test do
  # Debugging
  gem "debug", platforms: [:mri, :mingw, :x64_mingw]

  # Testing
  gem "capybara"
  gem "selenium-webdriver"
end

group :development do
  # Console on exceptions pages
  gem "web-console"
end