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

## Task and user access

All task endpoints require a Sanctum bearer token. Admins can access every task; members can access only tasks they created or are assigned to. Task responses never accept `created_by` from the client; new tasks are owned by the authenticated user.

- `GET /api/tasks` lists all tasks for admins and the member's created/assigned tasks, paginated 15 per page.
- `POST /api/tasks` creates a task for the authenticated user. It accepts `title` (required, maximum 100 characters), optional `description`, and optional boolean `is_completed` (defaults to `false`).
- `GET /api/tasks/{task}`, `PUT /api/tasks/{task}`, and `DELETE /api/tasks/{task}` show, replace, and delete tasks subject to the same access policy. `PUT` requires a non-empty `title` up to 100 characters and accepts optional `description` and `is_completed`; `PATCH` remains available for partial updates.
- `PUT /api/tasks/{task}/assignees` replaces the assignee list using `{ "user_ids": [1, 2] }`. Use an empty array to remove all assignees. Admins can manage assignees on any task; members need access to the task.

User management requires the `admin` role:

- `GET /api/users` and `GET /api/users/{user}` list and show users.
- `PATCH /api/users/{user}` updates `name`, `email`, and/or `role` (`admin` or `member`).
- `DELETE /api/users/{user}` deletes a user. Per the database foreign keys, this also deletes tasks created by that user.

The role middleware protects user-management routes, while `TaskPolicy` authorizes task actions. Authenticated requests without access receive HTTP 403; invalid input receives HTTP 422; unknown records receive HTTP 404.

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
