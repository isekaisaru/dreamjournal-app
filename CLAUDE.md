# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A dream journal application that allows users to record, analyze, and share their dreams. The application features authentication, dream recording with emotional analysis, and uses "Morpheus" as a mascot character.

## Architecture

**Full-stack application with:**

- **Frontend**: Next.js 15 with TypeScript, React 18, Tailwind CSS
- **Backend**: Ruby on Rails 7.0 API-only mode with PostgreSQL
- **Authentication**: HttpOnly cookie-based JWT authentication
- **Infrastructure**: Docker containerization with docker-compose

## Development Commands

### Docker Environment

```bash
# Build and start all services
docker-compose build
docker-compose up

# Start specific service
docker-compose up frontend
docker-compose up backend

# Database setup
docker-compose run backend rake db:create
docker-compose run backend rake db:migrate
```

### Frontend (Next.js)

```bash
cd frontend
yarn install
yarn dev          # Development server
yarn build        # Production build
yarn start        # Production server
yarn lint         # ESLint
yarn clean        # Clean build cache
```

### Backend (Rails)

```bash
cd backend
bundle install
bundle exec rails server    # Development server
bundle exec rails test      # Run tests
bundle exec rails console   # Rails console
```

## Key Architecture Patterns

### Authentication Flow

- Uses HttpOnly cookies for secure JWT storage
- Frontend AuthContext manages authentication state
- Backend ApplicationController handles token verification
- Automatic token refresh via `/auth/refresh` endpoint

### Asynchronous Dream Analysis Flow

- **Initiation**: Frontend sends `POST /dreams/:id/analyze`.
- **Backend Job**: Backend returns `202 Accepted` immediately and queues a background job (e.g., ActiveJob) to perform the AI analysis. The `Location` header in the response points to the status check endpoint.
- **Polling**: Frontend receives the 202 response and starts polling `GET /dreams/:id/analysis` every few seconds.
- **Status Updates**: The analysis endpoint returns the current status (`pending`, `done`, `failed`).
- **Result**: Once the status is `done` or `failed`, the frontend stops polling and displays the result or an error message.

### API Structure

- Rails API-only mode with CORS enabled
- RESTful resources for dreams, emotions, users
- Namespaced auth routes under `/auth`
- Cookie-based session management

### Frontend Organization

- App Router with layout.tsx for consistent UI
- Context-based authentication state management
- Centralized API client with axios and cookie support
- Component-based architecture with reusable UI components

### Database Models

- User model with secure password hashing (bcrypt)
- Dream model with user association and validations
- Emotion model with many-to-many relationship via DreamEmotion
- PostgreSQL with Active Record migrations

## Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
bundle exec rails test

# Frontend tests (add when testing is set up)
cd frontend
yarn test
```

### Database Operations

```bash
# Create and migrate database
docker-compose run backend rake db:create db:migrate

# Seed data
docker-compose run backend rake db:seed

# Reset database
docker-compose run backend rake db:reset
```

## Important Files

### Configuration

- `docker-compose.yml`: Multi-service container orchestration
- `frontend/next.config.mjs`: Next.js configuration with turbo enabled
- `backend/config/routes.rb`: API route definitions
- `backend/config/application.rb`: Rails application configuration

### Authentication

- `frontend/context/AuthContext.tsx`: Frontend authentication state
- `backend/app/controllers/application_controller.rb`: JWT authentication middleware
- `backend/app/services/auth_service.rb`: JWT token handling
- `frontend/lib/apiClient.ts`: Axios client with cookie support

### Core Models

- `backend/app/models/user.rb`: User authentication and dream association
- `backend/app/models/dream.rb`: Dream records with emotion relationships
- `backend/app/models/emotion.rb`: Emotion taxonomy for dream analysis

## API Endpoints

### Authentication

- `POST /auth/login`: User login with cookie setting
- `GET /auth/me`: Get current user info
- `POST /auth/verify`: Verify authentication status
- `POST /auth/refresh`: Refresh access token
- `POST /auth/logout`: Logout and clear cookies

### Dreams

- `GET /dreams`: List all dreams
- `POST /dreams`: Create new dream
- `GET /dreams/:id`: Get specific dream
- `PUT /dreams/:id`: Update dream
- `DELETE /dreams/:id`: Delete dream
- `POST /dreams/:id/analyze`: Start dream analysis job (returns 202 Accepted with `Location` header)
- `GET /dreams/:id/analysis`: Get analysis status and result (`{ status: 'pending'|'done'|'failed'|null, result: { text?, error? }|null, analyzed_at }`)
- `GET /dreams/my_dreams`: Get current user's dreams
- `GET /dreams/month/:year_month`: Get dreams by month

### Users

- `POST /register`: User registration
- `DELETE /users/:id`: Delete user account

## Environment Variables

### Frontend

- `NEXT_PUBLIC_API_URL`: Backend API URL (defaults to http://backend:3001 in Docker)

### Backend

- Database configuration via `.env` file
- JWT secret keys for token signing
- OpenAI API key for dream analysis features

## Port Configuration

- Frontend: localhost:8000 (maps to container port 3000)
- Backend: localhost:3001
- PostgreSQL: localhost:5432
