# All-in-one: PostgreSQL 16 + PostGIS + Bun API (linux/amd64 + linux/arm64).
# PostGIS packages come from PostgreSQL PGDG (multi-arch). Extension is created in docker-entrypoint.sh.
#
# Build (any platform Docker supports):
#   docker build -t lilypad .
# Run:
#   docker run --rm -p 3000:3000 -v lilypad-pg:/var/lib/postgresql/data lilypad
#
# Optional env: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, PORT, DATABASE_URL (overrides auto URL).

FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    gosu \
    unzip \
  && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    postgresql-16 \
    postgresql-16-postgis-3 \
    postgresql-client-16 \
  && rm -rf /var/lib/apt/lists/*

# Server tools (initdb, pg_ctl, pg_isready) live here; not linked into /usr/bin by default.
ENV PATH="/usr/lib/postgresql/16/bin:${PATH}"

ENV BUN_INSTALL=/root/.bun
ENV PATH="/root/.bun/bin:${PATH}"
RUN curl -fsSL https://bun.sh/install | bash

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY src ./src
COPY lib ./lib

# prisma.config.ts requires DATABASE_URL when the config loads; generate does not connect.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build?schema=public" bunx prisma generate

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV PGDATA=/var/lib/postgresql/data
ENV NODE_ENV=production
ENV PORT=3000
ENV POSTGRES_USER=lilypad
ENV POSTGRES_PASSWORD=lilypad
ENV POSTGRES_DB=lilypad
# Better Auth (required when NODE_ENV=production — override BETTER_AUTH_SECRET for real deploys)
ENV BETTER_AUTH_URL=http://localhost:3000
ENV BETTER_AUTH_SECRET=dev-docker-secret-replace-in-production-min-32-chars

EXPOSE 3000 5432

ENTRYPOINT ["/docker-entrypoint.sh"]
