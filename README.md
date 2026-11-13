# Task Management

Internal task management project with a Laravel API, a React/TypeScript frontend, PostgreSQL, and Docker Compose.

## Requirements

- PHP 8.3 or later and Composer
- PHP `pdo_pgsql` extension for local PostgreSQL connections
- Node.js 22 or later and npm
- PostgreSQL 17 for local development, or Docker Desktop with Docker Compose

## Local development

From the project root in PowerShell, create local environment files:

```powershell
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
if (-not (Test-Path frontend\.env)) { Copy-Item frontend\.env.example frontend\.env }
```

Ensure PostgreSQL is running and `backend\.env` has the correct connection settings.

Start the backend:

```powershell
Set-Location backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

In another terminal, start the frontend:

```powershell
Set-Location frontend
npm ci
npm run dev
```

The frontend is served at `http://localhost:5173`; the API is served at `http://localhost:8000`.

## Database schema

The backend migrations create users with `admin`/`member` roles, tasks, tags, and the `task_user` and `task_tag` assignment pivots. Eloquent relationships are available through `User::createdTasks()`, `User::assignedTasks()`, `Task::creator()`, `Task::assignees()`, `Task::tags()`, and `Tag::tasks()`.

Create the schema and optional local sample data from `backend`:

```powershell
php artisan migrate
php artisan db:seed
```

The seeder creates a small, repeatable task graph for local development.

## Docker development

Create the same two environment files if they do not exist, then start the services:

```powershell
docker compose up --build
```

In another terminal, initialize the Laravel key and database:

```powershell
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate
```

Docker Compose starts PostgreSQL, the Laravel API, and the Vite development server. The API container connects to the `postgres` service; local backend development uses `127.0.0.1`.

## API foundation

- `GET /api/health` returns `{"status":"ok"}`.
- CORS allows the origin configured by `FRONTEND_URL` in `backend/.env`.
- `VITE_API_BASE_URL` in `frontend/.env` is the frontend API base URL.

## Authentication

The API uses Laravel Sanctum personal access tokens. Registration and login return a bearer token and its expiration timestamp; send the token on protected requests as `Authorization: Bearer <token>`. Tokens expire after 60 minutes by default; change `SANCTUM_EXPIRATION` in `backend/.env` to adjust the lifetime.

- `POST /api/register` accepts `name`, `email`, `password`, and `password_confirmation`. Passwords must be at least eight characters with uppercase, lowercase, numeric, and symbol characters. Public registration always creates a `member`; a supplied `role` is rejected.
- `POST /api/login` accepts `email` and `password`. Attempts are limited to five per minute per email/IP pair.
- `GET /api/user` returns the authenticated user's public profile.
- `POST /api/logout` revokes the current bearer token only.
- Run `php artisan migrate` from `backend` to create the Sanctum token table.

Successful responses use `{ "message": "...", "data": { ... } }`. Validation and invalid-credential errors return HTTP 422; protected endpoints require a valid bearer token and otherwise return HTTP 401.

## Tests

Run backend tests from `backend`:

```powershell
php artisan test
```

Build and lint the frontend from `frontend`:

```powershell
npm run build
npm run lint
```
