#!/bin/sh
set -eu

database_directory=$(dirname "${DB_DATABASE:?DB_DATABASE must be set}")
mkdir -p "$database_directory"
touch "$DB_DATABASE"

php artisan migrate --force

exec "$@"
