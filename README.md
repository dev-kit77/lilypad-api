# Lilypad Backend

This repo contains the backend infrastructure for Lilypad, our concept for an invite-only forum focused on micro-locality and fostering conversations among people in their immediate area. We used [Bun](https://bun.com), which is a fast all-in-one JavaScript runtime.

## Run options

You can run the backend in one of two ways:

1. **Standard local setup**: run Bun locally and connect to your own local PostgreSQL database with PostGIS enabled.
2. **Docker setup**: run the app and database together with Docker Compose.

## Option 1: Local Bun + local PostgreSQL (with PostGIS)

### 1) Install dependencies

```bash
bun install
```

### 2) Start a local PostgreSQL instance and enable PostGIS

Create a database for the app, then enable the extension:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 3) Configure environment variables

Create `.env` from `.env-example` and set `DATABASE_URL` to your local Postgres instance.

### 4) Run the backend

```bash
bun run src/index.ts
```

### Optional: use `lilypad.sh` for guided local setup

If you prefer, you can run the helper script instead of doing each setup step manually:

```bash
./lilypad.sh
```

In a nutshell, this script:

- reads and validates your `.env` values (including `ENVIROMENT` and `DATABASE_URL`)
- checks PostgreSQL connectivity (when tooling is available)
- installs dependencies
- runs Prisma migration flow and Prisma client generation
- prepends `CREATE EXTENSION IF NOT EXISTS postgis;` into generated migration SQL
- optionally starts the API at the end

## Option 2: Docker Compose

### 1) Build and start the stack

```bash
docker compose up --build
```

This is a ready-to-go, cross-platform setup that starts both the Bun API and PostgreSQL.
