#!/bin/sh
# Single-container: local PostgreSQL + PostGIS, then Prisma migrate, then Bun API.
set -e

PGDATA="${PGDATA:-/var/lib/postgresql/data}"
POSTGRES_USER="${POSTGRES_USER:-lilypad}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-lilypad}"
POSTGRES_DB="${POSTGRES_DB:-lilypad}"
PORT="${PORT:-3000}"

mkdir -p "$PGDATA"
chown -R postgres:postgres "$PGDATA"

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data directory..."
  gosu postgres initdb -D "$PGDATA" --encoding=UTF8 --locale=C
  {
    echo ""
    echo "listen_addresses = '*'"
  } >>"$PGDATA/postgresql.conf"
  {
    echo ""
    echo "host all all 127.0.0.1/32 scram-sha-256"
  } >>"$PGDATA/pg_hba.conf"
fi

cleanup() {
  echo "Stopping PostgreSQL..."
  gosu postgres pg_ctl -D "$PGDATA" -m fast stop 2>/dev/null || true
}
trap cleanup EXIT

echo "Starting PostgreSQL..."
gosu postgres pg_ctl -D "$PGDATA" -l /tmp/postgres.log -w start

until gosu postgres pg_isready -q -d postgres; do
  sleep 0.2
done

echo "Ensuring database role and database exist..."
gosu postgres psql -v ON_ERROR_STOP=1 -d postgres -c \
  "CREATE USER \"${POSTGRES_USER}\" WITH PASSWORD '${POSTGRES_PASSWORD}';" 2>/dev/null \
  || gosu postgres psql -v ON_ERROR_STOP=1 -d postgres -c \
  "ALTER USER \"${POSTGRES_USER}\" WITH PASSWORD '${POSTGRES_PASSWORD}';"

DB_EXISTS=$(gosu postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${POSTGRES_DB}'" postgres 2>/dev/null | tr -d '[:space:]')
if [ "$DB_EXISTS" != "1" ]; then
  gosu postgres psql -v ON_ERROR_STOP=1 -d postgres -c \
    "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"
fi

echo "Creating PostGIS extension..."
gosu postgres psql -v ON_ERROR_STOP=1 -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS postgis;"

gosu postgres psql -v ON_ERROR_STOP=1 -d "$POSTGRES_DB" -c \
  "GRANT ALL ON SCHEMA public TO \"${POSTGRES_USER}\";"

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}?schema=public"
fi

cd /app
echo "Applying Prisma migrations..."
bunx prisma migrate deploy

echo "Starting API on port ${PORT}..."
exec bun run ./src/index.ts
