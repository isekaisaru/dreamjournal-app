# syntax=docker/dockerfile:1

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version and Gemfile
ARG RUBY_VERSION=3.3.0
FROM ruby:${RUBY_VERSION}-slim AS Builder

# Set environment variables to minimize the size of the resulting image
ENV RAILS_ENV=production \
    BUNDLE_WITHOUT="development test" \
    BUNDLE_FROZEN=true \
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Set working directory
WORKDIR /app

# Install packages needed to build gems and for runtime
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libvips-dev \
    postgresql-client \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy just the Gemfile to take advantage of Docker cache
COPY Gemfile ./

# Set permissions for the bundler cache directory to avoid permissions issues
RUN mkdir -p /usr/local/bundle/cache && chmod -R 777 /usr/local/bundle

# Install gems
# Note: We copy Gemfile.lock and run `bundle install` in a separate step to take advantage of Docker cache
COPY Gemfile.lock ./
RUN bundle config set without 'development test' && \
    bundle install --jobs 4 --retry 3

# Copy the rest of the application code
COPY . ./

# Use ARG to allow override of these values at build time. Provide default dummy values.
ARG SECRET_KEY_BASE
ARG RAILS_MASTER_KEY

# Set environment variables for the precompilation process
ENV SECRET_KEY_BASE=${SECRET_KEY_BASE} \
    RAILS_MASTER_KEY=${RAILS_MASTER_KEY}

# Precompile assets using the environment variables
RUN if [ -n "$SECRET_KEY_BASE" ] && [ -n "$RAILS_MASTER_KEY" ]; then bundle exec rails assets:precompile; fi

# Remove folders not needed in resulting image
RUN rm -rf node_modules tmp/cache app/assets vendor/assets spec

# Start a new stage from scratch to create a slim final image
FROM ruby:${RUBY_VERSION}-slim
COPY --from=Builder /usr/local/bundle/ /usr/local/bundle/
COPY --from=Builder /app /app
WORKDIR /app

# Install runtime dependencies
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    libpq5 \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and switch to it
RUN groupadd -r rails && useradd --no-log-init -r -g rails rails \
    && chown -R rails:rails /usr/local/bundle /app
USER rails

# Expose port 3000 to the Docker host, so we can access it from the outside.
EXPOSE 3000

# The main command to run when the container starts.
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]