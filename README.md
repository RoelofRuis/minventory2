# Minventory

A web application to index and organize your belongings with security and privacy in mind.

## Features

- **Secure Authentication**: Password-based login with Google Authenticator (TOTP) 2FA enforced.
- **Back-Channel User Management**: Create users and setup 2FA securely via console CLI, ensuring no public registration endpoints are exposed.
- **Encryption at Rest**: All item names and images are encrypted in the database using AES-256-GCM. The encryption key is derived from your login password, ensuring only you can access your data.
- **Blob Storage**: Images are stored as encrypted blobs directly in the database.
- **Responsive Design**: Dark theme with silver and purple accents, optimized for tablet and mobile.
- **Flexible Backend**: Supports both PostgreSQL and an In-Memory database for easy development.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker (optional, for local PostgreSQL)

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To run the application with an **In-Memory database** (data will be lost on restart):

1. Start the development server:
   ```bash
   npm run dev
   ```
2. In another terminal, start the backend server:
   ```bash
   npm run server-dev
   ```

To run with **PostgreSQL**:

1. Start the database using Docker Compose:
   ```bash
   docker-compose up -d
   ```
2. Configure your environment in a `.env` file.
3. Run seeding (if needed):
   ```bash
   npm run seed
   ```
4. Start the application.

## Default Credentials

The application is pre-seeded with a default user for testing purposes:

- **Username**: `admin`
- **Password**: `password123`

*Note: In-memory database is auto-seeded with these credentials on startup.*

## Development

- `npm run dev`: Starts the Vite development server for the frontend.
- `npm run build`: Builds the frontend and backend for production.
- `npm run seed`: Seeds the PostgreSQL database with initial data.


## Production Build & Deployment

You can build a single, multi‑stage Docker image that contains the compiled frontend and backend and is ready for production.

### Database migrations in production
- Migrations now run automatically on container startup when `DB_TYPE=postgres` is set and `DATABASE_URL` points to your database.
- The Docker image includes compiled JavaScript migrations and the server applies them at boot via `knex.migrate.latest(...)`.
- You can also run them manually inside the image if needed:
  ```bash
  docker run --rm \
    -e DB_TYPE=postgres \
    -e DATABASE_URL="postgres://user:password@host:5432/minventorydb" \
    minventory:prod node server/dist/migrate.js
  ```
- Important: Take backups before applying migrations in production. The operation is idempotent and safe to re‑run.

### Build the production image

```bash
docker build -t minventory:prod .
```

Environment variables the container understands:

- `SESSION_SECRET` (required in production): a long, random string used to sign sessions.
- `DB_TYPE`: set to `postgres` to use PostgreSQL; omit it to use the in‑memory database (good for quick demos).
- `DATABASE_URL`: PostgreSQL connection string, e.g. `postgres://user:password@db:5432/minventorydb` (only needed when `DB_TYPE=postgres`).
- `BYPASS_2FA`: set to `true` to disable 2FA enforcement on login (useful for development or recovery).
- `PORT`: app listen port inside the container (defaults to `8080` in the image).

Example run command (production‑like):

```bash
docker run -d --name minventory \
  -p 8080:8080 \
  -e SESSION_SECRET="change-me-to-a-long-random-string" \
  -e DB_TYPE=postgres \
  -e DATABASE_URL="postgres://user:password@db:5432/minventorydb" \
  minventory:prod
```

Notes:
- Put the container behind HTTPS in real deployments. If you terminate TLS at a proxy, ensure session cookies are marked secure at that layer.
- The image exposes port `8080` and serves the built SPA plus the API from the same process.

## Test the production image locally

You have two easy options.

### Option A — Quick test with in‑memory DB (no external services)

This runs entirely in memory and auto‑seeds the default user.

```bash
docker run --rm -p 8080:8080 \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  minventory:prod
```

Open http://localhost:8080 and sign in with the default credentials listed below.

### Option B — Test with PostgreSQL (via Docker Compose)

1) Start PostgreSQL using the provided Compose file:

```bash
docker compose up -d db
```

2) Migrations: no manual step needed. The production container now runs Knex migrations automatically on startup when `DB_TYPE=postgres` is set. If you prefer to run them from your host instead (optional), you still can:

```bash
export DB_TYPE=postgres
export DATABASE_URL=postgres://user:password@localhost:5432/minventorydb
npm run db:migrate
```

Optional: seed sample data (also from your host):

```bash
npm run seed
```

3) Start the application container on the same Docker network as the `db` service and map port 8080:

- Replace `minventory3_default` with the default network name for your clone (it’s typically `<folder>_default`).

```bash
docker run --rm --name minventory \
  --network minventory3_default \
  -p 8080:8080 \
  -e SESSION_SECRET="change-me-to-a-long-random-string" \
  -e DB_TYPE=postgres \
  -e DATABASE_URL="postgres://user:password@db:5432/minventorydb" \
  minventory:prod
```

4) Open http://localhost:8080

- If you ran the seed step, log in with the default user below. Otherwise, use the back-channel CLI to create a user (see below).

## User Management (Back-Channel)

To create a user and set up 2FA, use the following CLI command:

```bash
npm run create-user <username> <password>
```

This will output a 2FA secret and a QR code to scan with your Authenticator app. Registration via the web UI is disabled for security.

## Default Credentials

The application is pre-seeded with a default user for testing purposes:

- **Username**: `admin`
- **Password**: `password123`

*Note: In-memory database is auto-seeded with these credentials on startup. For PostgreSQL, run the seed step above to add them.*
