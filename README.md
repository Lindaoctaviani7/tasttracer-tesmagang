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
- Sanctum is not installed yet; authentication is intentionally outside this initialization scope.

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
