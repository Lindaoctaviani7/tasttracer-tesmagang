# Task Management

Aplikasi internal untuk mengelola tugas tim dengan backend Laravel REST API dan frontend React TypeScript. Autentikasi menggunakan Laravel Sanctum bearer token dan database menggunakan SQLite.

## Fitur

- Registrasi member, login, logout, dan profil pengguna terautentikasi.
- CRUD tugas, pencarian, filter status, pagination, serta pengelolaan assignee dan tag.
- Hak akses tugas berdasarkan role dan kepemilikan/penugasan.
- Fitur admin: ringkasan statistik, manajemen seluruh tugas, pencarian dan filter pengguna, detail pengguna, serta perubahan role.
- Seeder berisi akun demo dan data tugas lokal.

## Teknologi

- PHP 8.3+ dan Laravel 13
- Laravel Sanctum 4
- SQLite
- React 19, TypeScript, Vite 8, React Router, Axios
- Tailwind CSS 4
- Docker Compose v2 untuk lingkungan development

## Arsitektur

```text
Browser
  └── React + Vite (:5173)
        └── /api melalui Vite proxy
              └── Laravel REST API (:8000)
                    ├── Sanctum authentication
                    ├── Form Requests, Policies, Resources
                    └── SQLite (file pada Docker named volume)
```

Vite development server dan `php artisan serve` melayani frontend dan API; reverse proxy tambahan tidak diperlukan untuk development. SQLite adalah file database, bukan service jaringan, sehingga Compose tidak menjalankan PostgreSQL. Healthcheck Compose memeriksa kesiapan API setelah migrasi berhasil.

## Struktur folder

```text
backend/
  app/                 Controllers, Requests, Resources, Models, Policies
  database/            Migrations, factories, seeders, SQLite lokal
  routes/api.php       REST API
  tests/               PHPUnit feature tests
  Dockerfile
frontend/
  src/api/             Axios client dan token storage
  src/components/      Komponen UI
  src/contexts/        Authentication state
  src/hooks/
  src/pages/
  src/routes/
  src/services/        API services
  src/types/
  Dockerfile
docker-compose.yml
```

## Persyaratan

Untuk development tanpa Docker:

- PHP 8.3 atau lebih baru dengan ekstensi `pdo_sqlite`
- Composer 2
- Node.js 22 atau lebih baru dan npm

Untuk Docker:

- Docker Desktop atau Docker Engine
- Docker Compose v2

## Instalasi backend (lokal)

Dari root repository di PowerShell, salin contoh konfigurasi sekali saja agar file lokal yang sudah ada tidak tertimpa:

```powershell
if (-not (Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
if (-not (Test-Path frontend\.env)) { Copy-Item frontend\.env.example frontend\.env }
```

Lalu jalankan backend:

```powershell
Set-Location backend
composer install
php artisan key:generate
if (-not (Test-Path database\database.sqlite)) { New-Item -ItemType File database\database.sqlite }
php artisan migrate
php artisan db:seed
php artisan serve
```

API tersedia di `http://localhost:8000`. Jangan menjalankan `migrate:fresh` pada database yang berisi data yang ingin dipertahankan.

## Instalasi frontend (lokal)

Di terminal lain:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Frontend tersedia di `http://localhost:5173`. `VITE_API_URL=/api` menggunakan Vite proxy; `API_PROXY_TARGET` pada `frontend/.env` secara default menunjuk ke backend lokal di port 8000. Ubah nilai tersebut hanya jika backend berjalan pada alamat berbeda.

### Cara cepat Windows

Jika frontend menampilkan **“Server API mengalami gangguan”** atau terminal Vite menunjukkan `ECONNREFUSED 127.0.0.1:8000`, backend belum berjalan. Dari root project, gunakan skrip ini untuk menyiapkan konfigurasi/migrasi dan membuka backend serta frontend di terminal terpisah:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

Untuk juga membuat/memperbarui akun demo pada database lokal:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1 -SeedDemo
```

Tanpa `-SeedDemo`, skrip tidak mengubah password akun demo. Untuk percobaan aman, buka `http://localhost:5173/register`, daftar memakai alamat email baru dan password yang memenuhi syarat, lalu masuk memakai kredensial yang sama. Setelah sukses, aplikasi mengarahkan ke dashboard.

Jika frontend dibuka dari perangkat lain dalam jaringan lokal, buka `http://<IP-komputer-development>:5173/login`; backend tetap harus dijalankan pada komputer tersebut. Pastikan firewall Windows mengizinkan koneksi jaringan lokal ke port 5173. Vite mem-proxy API ke `127.0.0.1:8000` pada komputer host. Ini hanya konfigurasi development; jangan mengirim password melalui jaringan publik atau HTTP tanpa TLS.

## Konfigurasi SQLite

`backend/.env.example` menggunakan:

```dotenv
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

File database lokal berada di `backend/database/database.sqlite` dan tidak dilacak Git. Buat file tersebut jika belum ada, kemudian jalankan:

```powershell
Set-Location backend
php artisan migrate
php artisan db:seed
php artisan migrate:status
```

Seeder demo hanya boleh dijalankan pada environment `local` atau `testing`; perintah pada environment lain akan berhenti dengan error. Seeder idempotent untuk akun dan data contoh.

## Menjalankan dengan Docker Compose

Pastikan `backend/.env` sudah dibuat dari contoh. Buat application key di image/container (perubahan `.env` tersimpan pada folder backend yang di-mount):

```powershell
docker compose build
docker compose run --rm --no-deps --entrypoint php backend artisan key:generate --force
docker compose up
```

Entrypoint backend membuat file SQLite pada named volume dan menjalankan `php artisan migrate --force` sebelum Laravel menerima request. Frontend meneruskan `/api` ke service backend. Compose memeriksa `/api/health` dan menunggu backend sehat sebelum menjalankan frontend.

Untuk memasukkan data demo:

```powershell
docker compose exec backend php artisan db:seed
```

Untuk melihat status dan menghentikan layanan:

```powershell
docker compose ps
docker compose down
```

Data SQLite tetap ada setelah `docker compose down`, karena disimpan dalam named volume `sqlite_data`. **Jangan gunakan `docker compose down --volumes` kecuali memang ingin menghapus database dan seluruh data volume development.**

Konfigurasi development ini tidak menjalankan PostgreSQL: keputusan proyek menggunakan SQLite. Karena SQLite tidak memiliki server database untuk diperiksa dengan `pg_isready`, readiness diperiksa melalui healthcheck API; startup API sendiri menjalankan migrasi sebelum menerima traffic.

## Akun demo

Jalankan seeder pada environment lokal:

| Role | Email | Password development |
|---|---|---|
| Admin | `admin@example.com` | `Taskflow-Local-2026!` |
| Member | `member@example.com` | `Taskflow-Local-2026!` |

Password tersebut hanya untuk development dan berasal dari seeder lokal. Jangan gunakan pada production. Registrasi publik selalu membuat role `member`; perubahan role tersedia hanya melalui administrasi admin.

## Role dan hak akses

- **Admin:** dapat melihat dan mengelola semua tugas, assignee, tag master, pengguna dan role, serta statistik keseluruhan.
- **Member:** hanya dapat melihat/mengelola tugas yang dibuat sendiri atau ditugaskan kepadanya; dapat mengelola relasi assignee/tag tugas yang dapat dikelola, dan tidak dapat mengakses administrasi.
- Endpoint admin dilindungi middleware backend. Menyembunyikan navigasi frontend bukan satu-satunya lapisan otorisasi.
- Endpoint registrasi dan login bersifat publik. `GET /api/health` bersifat publik untuk healthcheck. Endpoint bisnis lainnya memerlukan Sanctum bearer token.

## Endpoint API

Semua endpoint diawali `/api`. Endpoint terproteksi memerlukan header `Authorization: Bearer <token>`. Response sukses menggunakan bentuk `{ "message": "...", "data": ... }`.

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| GET | `/health` | Publik | Healthcheck API |
| POST | `/register` | Publik | Registrasi sebagai member |
| POST | `/login` | Publik | Login; dibatasi rate limit |
| GET | `/user` | Terautentikasi | Profil pengguna aktif |
| POST | `/logout` | Terautentikasi | Mencabut token aktif |
| GET | `/tasks` | Terautentikasi | Daftar tugas; menerima `status`, `search`, `page`, `per_page` |
| POST | `/tasks` | Terautentikasi | Membuat tugas dengan `created_by` dari token |
| GET | `/tasks/{task}` | Terautentikasi + policy | Detail tugas |
| PUT, PATCH | `/tasks/{task}` | Terautentikasi + policy | Memperbarui tugas |
| DELETE | `/tasks/{task}` | Terautentikasi + policy | Menghapus tugas |
| GET | `/tasks/{task}/assignees` | Terautentikasi + policy | Daftar assignee |
| POST | `/tasks/{task}/assignees` | Terautentikasi + policy | Menambahkan assignee |
| PUT | `/tasks/{task}/assignees` | Terautentikasi + policy | Mengganti daftar assignee |
| DELETE | `/tasks/{task}/assignees/{userId}` | Terautentikasi + policy | Menghapus satu assignee |
| GET | `/users/assignee-options` | Terautentikasi | Pilihan assignee, pencarian dan pagination |
| GET | `/tags` | Terautentikasi | Daftar tag |
| POST | `/tags` | Admin | Membuat tag |
| PUT | `/tags/{tag}` | Admin | Mengubah tag |
| DELETE | `/tags/{tag}` | Admin | Menghapus tag |
| POST | `/tasks/{task}/tags` | Terautentikasi + policy | Menambahkan tag ke tugas |
| DELETE | `/tasks/{task}/tags/{tagId}` | Terautentikasi + policy | Menghapus relasi tag |
| GET | `/admin/dashboard/stats` | Admin | Statistik pengguna dan tugas |
| GET | `/admin/users` | Admin | Daftar, pencarian, filter `role`, pagination |
| GET | `/admin/users/{user}` | Admin | Detail pengguna |
| PATCH | `/admin/users/{user}/role` | Admin | Mengubah role; tidak boleh mengubah diri sendiri atau menurunkan admin terakhir |
| GET | `/users` | Admin | Daftar pengguna |
| GET | `/users/{user}` | Admin | Detail pengguna |
| PUT, PATCH | `/users/{user}` | Admin | Memperbarui pengguna sesuai validasi |
| DELETE | `/users/{user}` | Admin | Menghapus pengguna; admin terakhir dilindungi |

Validation error mengembalikan HTTP 422, akses tanpa autentikasi 401, akses terlarang 403, record tidak ditemukan 404, dan konflik aturan admin terakhir 409.

## Automated testing

Jalankan seluruh PHPUnit feature tests dari `backend`:

```powershell
Set-Location backend
php artisan test
```

Jalankan test frontend, lint, dan production build dari `frontend`:

```powershell
Set-Location frontend
npm test
npm run lint
npm run build
```

Suite backend menggunakan SQLite in-memory agar tidak mengubah database lokal. Frontend memakai Vitest dan Testing Library.

## Asumsi dan keputusan implementasi

- SQLite dipilih menggantikan PostgreSQL untuk development lokal dan Docker; PostgreSQL bukan bagian dari Compose.
- Dockerfile dan Compose ditujukan untuk development. Backend menggunakan `php artisan serve`, frontend menggunakan Vite dev server; deployment production memerlukan server/proxy dan konfigurasi runtime tersendiri.
- Token Sanctum dikirim sebagai bearer token oleh frontend. Password tidak disimpan di browser.
- Seeder merupakan data demonstrasi lokal, bukan data production.
- Docker belum dapat dijalankan pada mesin ini jika Docker CLI/Engine tidak tersedia; lihat hasil final audit yang menyertai perubahan.
