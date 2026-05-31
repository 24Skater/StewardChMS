# StewardChMS — Deployment and Production Operations Guide

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Docker Compose Deployment](#docker-compose-deployment)
3. [Production Checklist](#production-checklist)
4. [Stripe Integration](#stripe-integration)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Health Check](#health-check)
7. [Database Maintenance](#database-maintenance)
8. [Security Hardening](#security-hardening)
9. [CI/CD Integration](#cicd-integration)

---

## Local Development Setup

### Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| Node.js | 20.x | LTS recommended; `>=18` accepted by the engine field |
| npm | 10.x | Bundled with Node 20 |
| PostgreSQL | 16.x | Must be running and reachable before starting the backend |

### Step-by-Step Setup

**1. Clone the repository**

```bash
git clone https://github.com/your-org/StewardChMS.git
cd StewardChMS
```

**2. Install all workspace dependencies**

```bash
npm ci
```

This installs dependencies for all three workspaces (`frontend`, `backend`, `shared`) in a single step.

**3. Create the backend environment file**

```bash
cd backend
cp env.example .env
```

Open `backend/.env` and set at minimum:

```dotenv
DATABASE_URL="postgresql://your_user:your_password@localhost:5432/stewardchms"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
CORS_ORIGIN=http://localhost:5173
```

See [Environment Variables Reference](#environment-variables-reference) for all supported variables.

**4. Create the database**

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE stewardchms;"

# Or via createdb
createdb -U postgres stewardchms
```

**5. Run database migrations**

```bash
npm run db:migrate -w backend
```

Prisma creates all tables and generates the client. If prompted for a migration name, enter a short label such as `init`.

**6. Seed the database**

```bash
npm run db:seed -w backend
```

The seed script is fully idempotent. On first run it creates:

- All 37 system permissions across all domains
- The `admin` role with all permissions assigned
- The `scheduler` role with `schedules.view` and `schedules.manage`
- A disabled emergency seed account (`seed@stewardchms.local`) with a randomly generated password
- Two scheduling message templates (`schedule.assigned`, `schedule.reminder`)

The seed script does **not** create the primary admin user. That is done through the in-app setup wizard.

**7. Start both servers**

```bash
# Terminal 1 — backend API on http://localhost:3001
npm run dev:backend

# Terminal 2 — frontend dev server on http://localhost:5173
npm run dev:frontend
```

**8. Complete the setup wizard**

Open `http://localhost:5173`. The app redirects to the setup wizard when no primary admin exists. Complete four steps:

- **Step 1**: Primary admin account (email, password min 12 chars, display name)
- **Step 2**: Church details (name, address, timezone, currency)
- **Step 3**: Branding (logo URL, primary color, tagline)
- **Step 4**: Email provider — choose `none` for local development; configure SMTP or SendGrid for production

### Default Credentials Warning

The `docker.env` file and `docker-compose.yml` ship with these insecure defaults:

- `ADMIN_PASSWORD=admin123`
- `JWT_SECRET=change-this-in-production-please`
- `POSTGRES_PASSWORD=steward123`

**All three must be changed before any deployment accessible from a network.** The backend exits at startup in `NODE_ENV=production` if `JWT_SECRET` is shorter than 32 characters or matches a known insecure default.

---

## Docker Compose Deployment

### Overview

The `docker-compose.yml` at the project root orchestrates four containers:

| Service | Image | Purpose | Exposed Port |
|---------|-------|---------|--------------|
| `db` | `postgres:16-alpine` | PostgreSQL database | 5432 |
| `backend` | Built from `backend/Dockerfile` | Express API (tsx runtime) | 3001 |
| `frontend` | Built from `frontend/Dockerfile` | nginx serving the React SPA | 80 |
| `migrate` | Built from `backend/Dockerfile.migrate` | One-time migration + seed job | none |

All four share the `stewardchms-network` Docker network. The `migrate` service executes `npx prisma migrate deploy && npm run db:seed` then exits (`restart: "no"`).

### Environment Variable Customization

```bash
cp docker.env.example docker.env
```

Edit `docker.env` before starting the stack:

```dotenv
# Database
POSTGRES_USER=steward
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=stewardchms

# JWT -- generate with: openssl rand -hex 32
JWT_SECRET=<64-char-hex-string>
JWT_EXPIRES_IN=7d

# CORS -- set to your actual frontend URL in production
CORS_ORIGIN=https://chms.your-church.com

# Admin user created during first seed
ADMIN_EMAIL=admin@your-church.com
ADMIN_PASSWORD=<strong-password-min-12-chars>
ADMIN_NAME=System Administrator
```

### Starting the Stack

**First run — builds images, runs migrations, and seeds the database:**

```bash
docker compose --env-file docker.env up -d --build
```

The `migrate` service runs before backend and frontend start. Startup order is enforced by healthcheck dependencies: `backend` waits for `db` to be healthy, and `frontend` waits for `backend` to be healthy.

**Subsequent starts (no code changes):**

```bash
docker compose --env-file docker.env up -d
```

**Rebuild images after code changes:**

```bash
docker compose --env-file docker.env up -d --build
```

### Stopping the Stack

```bash
# Stop containers -- data in volumes is preserved
docker compose down

# Stop and remove all volumes -- DESTROYS ALL DATA -- development only
docker compose down -v
```

### Viewing Logs

```bash
# Follow all services
docker compose logs -f

# Follow a single service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
docker compose logs -f migrate
```

### Volume Persistence

PostgreSQL data is stored in the named Docker volume `postgres_data`, mapped to `/var/lib/postgresql/data` inside the container. This volume persists across `docker compose down` and container restarts. It is only destroyed by `docker compose down -v` or `docker volume rm stewardchms_postgres_data`.

```bash
docker volume inspect stewardchms_postgres_data
```

### Connecting to the Containerized Database

The `db` container exposes port 5432 on the host:

| Field | Value |
|-------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | Value of `POSTGRES_DB` (default: `stewardchms`) |
| User | Value of `POSTGRES_USER` (default: `steward`) |
| Password | Value of `POSTGRES_PASSWORD` (default: `steward123`) |

```bash
psql -h localhost -p 5432 -U steward -d stewardchms
```

To browse data visually via Prisma Studio (requires `backend/.env` pointing at the container):

```bash
npm run db:studio -w backend
# Opens http://localhost:5555
```

### Nginx Reverse Proxy

The `frontend` container runs nginx on port 80 using `frontend/nginx.conf`. It handles four concerns:

1. **API proxy** — `/api/*` requests are forwarded to `http://backend:3001` inside the Docker network. Headers `X-Real-IP`, `X-Forwarded-For`, and `X-Forwarded-Proto` are preserved.
2. **Public schedule proxy** — `/public/*` requests are forwarded to the backend without authentication (used by the ministry schedule kiosk display).
3. **SPA fallback** — All other paths serve `index.html`, allowing React Router to handle client-side navigation without 404s at the nginx layer.
4. **Static asset caching** — JS, CSS, images, and fonts are served with `Cache-Control: public, immutable` and a 1-year `Expires` header. Gzip is enabled for text responses >= 1024 bytes.

The frontend container on port 80 is the single public entry point. Direct external access to port 3001 is not intended in production.

### Using an Existing Database Container

If you have an existing PostgreSQL container named `stewardchms-db`, use the alternate compose file:

```bash
# One-time: connect your existing DB to the shared network
docker network create stewardchms-network
docker network connect stewardchms-network stewardchms-db

# One-time: run migrations and seed
docker compose -f docker-compose.existing-db.yml --profile migrate up migrate

# Start the app
docker compose -f docker-compose.existing-db.yml up -d --build
```

---

## Production Checklist

Complete every item before exposing the application to real users or church data.

### Security

- [ ] **Generate a strong JWT_SECRET** — minimum 32 characters. The backend exits at startup if the value is shorter or matches a known insecure default.
  ```bash
openssl rand -hex 32
```
- [ ] **Set `NODE_ENV=production`** — enables the `Secure` cookie flag, enforces `JWT_SECRET` length validation, and disables Prisma development warnings.
- [ ] **Change the default admin password** — the setup wizard requires at least 12 characters with at least 3 character types. Do not reuse `admin123`.
- [ ] **Change the default PostgreSQL password** — replace `steward123` in `docker.env` before first deployment.
- [ ] **Set `CORS_ORIGIN` to your actual frontend domain** — must be the exact origin (scheme + hostname + optional port, no trailing slash). Wildcard `*` is rejected at startup in production.
  ```dotenv
CORS_ORIGIN=https://chms.your-church.com
```

### TLS / HTTPS

- [ ] **Configure SSL/TLS** — the nginx container serves HTTP only on port 80. Add TLS at one of these layers:

  **Option A — Nginx with Let's Encrypt (Certbot)**

  Extend `frontend/nginx.conf` to listen on 443:

  ```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    # ... existing location blocks from frontend/nginx.conf ...
}
server {
    listen 80;
    return 301 https://$host$request_uri;
}
```

  **Option B — External reverse proxy (Caddy, Traefik, cloud load balancer)**

  Point the proxy at port 80 on the host and let it handle TLS termination. Ensure it sets `X-Forwarded-Proto: https` so the backend sets the `Secure` cookie flag correctly.

### Stripe

- [ ] **Configure Stripe keys for production** — enter live keys (`sk_live_...` / `pk_live_...`) in the admin Settings UI. Use test keys (`sk_test_...` / `pk_test_...`) in non-production environments.
- [ ] **Set `STRIPE_WEBHOOK_SECRET`** — register the webhook endpoint in the Stripe Dashboard and add the signing secret to your environment.

### Messaging Providers

- [ ] **Replace the email stub** — `EmailStubProvider` only logs emails to the console. Configure a real provider in the setup wizard (SMTP or SendGrid) or implement the `MessageProvider` interface in `backend/src/providers/messaging/` for other providers.
- [ ] **Replace the SMS stub** — `SmsStubProvider` only logs SMS to the console. Implement a real SMS provider such as Twilio or Vonage using the same `MessageProvider` interface.

### Database

- [ ] **Enable PostgreSQL backups** — the `postgres_data` volume is not automatically backed up. Schedule daily `pg_dump` exports stored off-host. See [Database Maintenance](#database-maintenance).
- [ ] **Switch the token blacklist from in-memory to Redis or a database table** — see [Security Hardening](#security-hardening).

### Monitoring

- [ ] **Configure uptime monitoring** — poll `GET /api/health` every 1–5 minutes and alert on non-200 responses. See [Health Check](#health-check).
- [ ] **Set up log aggregation** — configure Docker logging drivers or pipe `docker compose logs` to a centralized log service.

---

## Stripe Integration

### Overview

Stripe powers the online giving feature. The integration is optional — when Stripe keys are not configured the giving endpoint returns `503 Service Unavailable` and the giving UI is hidden.

### Configuration

Stripe keys are stored in the database via the admin Settings UI:

- `stripe.public_key` — Stripe publishable key, returned to the frontend via `GET /api/online-giving/config`
- `stripe.secret_key` — Stripe secret key, used server-side only and never returned to clients

The webhook signing secret is read from the environment:

```dotenv
STRIPE_WEBHOOK_SECRET=whsec_...
```

Add this to `docker.env` (Docker deployments) or `backend/.env` (local development).

### Test vs Live Keys

| Environment | Secret Key Prefix | Publishable Key Prefix |
|-------------|------------------|------------------------|
| Test | `sk_test_...` | `pk_test_...` |
| Live (production) | `sk_live_...` | `pk_live_...` |

Configure test keys in the admin Settings UI during development. Switch to live keys only when ready to accept real donations.

### Webhook Endpoint

```
POST /api/online-giving/webhook
```

Register this URL in the Stripe Dashboard under **Developers → Webhooks**.

**Events handled:**

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Creates or updates a `Donation` record with `stripeStatus: 'succeeded'` |
| `payment_intent.payment_failed` | Updates the donation's `stripeStatus` to `'failed'` |

All other event types are acknowledged with `{ received: true }` but not acted on. Every request is signature-verified using `STRIPE_WEBHOOK_SECRET`. Requests with an invalid or missing signature return `400 Bad Request`.

### Testing Locally with the Stripe CLI

```bash
# Install and authenticate
stripe login

# Forward events to the local backend
stripe listen --forward-to localhost:3001/api/online-giving/webhook
```

The CLI prints a temporary signing secret such as `whsec_abc123...`. Add it to `backend/.env`:

```dotenv
STRIPE_WEBHOOK_SECRET=whsec_<value-from-cli>
```

Trigger a test event:

```bash
stripe trigger payment_intent.succeeded
```

---

## Environment Variables Reference

### Backend (`backend/.env` or Docker environment block)

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string | `postgresql://steward:pass@localhost:5432/stewardchms` |
| `JWT_SECRET` | **Yes** (production) | `dev-secret-change-in-production` | Signing secret for JWT tokens. Min 32 characters; startup fails in production without a valid value. | Output of `openssl rand -hex 32` |
| `NODE_ENV` | No | `development` | Runtime environment. Must be `production` in all deployed environments. | `production` |
| `PORT` | No | `3001` | TCP port the Express server listens on | `3001` |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Exact allowed CORS origin. Wildcard `*` is rejected in production. | `https://chms.your-church.com` |
| `JWT_EXPIRES_IN` | No | `7d` | JWT token lifetime. Format: number + unit (d=days, h=hours, m=minutes, s=seconds). | `7d` |
| `ADMIN_EMAIL` | No | `admin@stewardchms.local` | Email for the seeded admin account | `admin@your-church.com` |
| `ADMIN_PASSWORD` | No | `admin123` | Password for the seeded admin account. **Must be changed before production.** | Strong 12+ char password |
| `ADMIN_NAME` | No | `System Administrator` | Display name for the seeded admin | `John Smith` |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook signing secret. Required to process Stripe webhook events. | `whsec_abc123...` |

### Docker Compose (`docker.env`)

These variables configure the `db` container and are interpolated into the `backend` and `migrate` service environment blocks:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `steward` | PostgreSQL user created inside the container |
| `POSTGRES_PASSWORD` | `steward123` | PostgreSQL password. **Change before deployment.** |
| `POSTGRES_DB` | `stewardchms` | PostgreSQL database name |

All backend variables listed above are also valid in `docker.env`.

### Generating JWT_SECRET

Use any of these commands to produce a cryptographically random 64-character hex string:

```bash
# OpenSSL (Linux, macOS, WSL)
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Set the output as the value of `JWT_SECRET`.

---

## Health Check

### Endpoint

```
GET /api/health
```

No authentication required. Safe to call from external monitors.

### Response

```json
{
  "status": "ok",
  "timestamp": "2026-05-30T00:00:00.000Z",
  "service": "StewardChMS API"
}
```

Returns HTTP `200` when the API process is running. A `200` confirms the Node.js process is alive and accepting requests. The endpoint does not currently check database connectivity.

### Docker Healthcheck Configuration

Both `backend/Dockerfile` and `docker-compose.yml` configure the same healthcheck:

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  start_period: 10s
  retries: 3
```

The `frontend` service depends on `backend` reaching the `healthy` state (`condition: service_healthy`) before starting, ensuring nginx does not serve traffic until the API is ready.

### Uptime Monitoring

Point your monitoring service at `https://your-domain.com/api/health`. A `200` response with `"status": "ok"` is the success condition. Alert on non-200 responses or response times over 2 seconds.

---

## Database Maintenance

### Running Migrations in Production

Use `migrate deploy` in production — never `migrate dev`, which can interactively prompt for a database reset.

```bash
# From the project root
npx prisma migrate deploy --schema=backend/prisma/schema.prisma

# Inside the Docker stack (re-runs the migrate service)
docker compose --env-file docker.env run --rm migrate
```

`migrate deploy` applies all pending migrations in order without prompting. Already-applied migrations are skipped, making it safe to run multiple times.

### Re-Seeding

The seed script is idempotent for permissions, roles, and message templates. Run it any time a release adds new permissions:

```bash
# Local
npm run db:seed -w backend

# Docker
docker compose --env-file docker.env run --rm migrate sh -c "npm run db:seed"
```

The script does not overwrite the primary admin account or change the seed account password if those already exist.

### Demo Data

```bash
# Load demo data (additive)
npm run db:seed-demo -w backend

# Reset to a clean demo state -- DESTRUCTIVE, removes existing data first
npm run db:seed-demo:reset -w backend
```

Do not run the demo seed in production.

### Destructive Reset (Development Only)

```bash
# Drops and recreates the database, runs all migrations, then re-seeds
npx prisma migrate reset --schema=backend/prisma/schema.prisma
```

Prisma blocks this command in production environments.

### Backup Strategy

**Manual backup:**

```bash
# Dump from the running Docker container
docker exec stewardchms-db pg_dump -U steward stewardchms > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from a dump
docker exec -i stewardchms-db psql -U steward stewardchms < backup-20260530-000000.sql
```

**Recommended automated schedule:**

1. Daily `pg_dump` compressed to `.sql.gz`
2. Retain 30 days of daily backups
3. Retain 12 months of monthly snapshots
4. Store backups off-host (S3, Backblaze B2, or equivalent object storage)

Example cron job on the Docker host:

```bash
# /etc/cron.d/stewardchms-backup
0 2 * * * root docker exec stewardchms-db pg_dump -U steward stewardchms | gzip > /backups/stewardchms-$(date +\%Y\%m\%d).sql.gz
```

---

## Security Hardening

### Helmet.js Security Headers

The backend applies [Helmet](https://helmetjs.github.io/) as the first middleware layer:

```typescript
app.use(helmet())
```

This automatically sets `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `X-DNS-Prefetch-Control`, `Referrer-Policy`, and `Strict-Transport-Security` (when `NODE_ENV=production`).

### Rate Limiting

Five rate limiters protect the API:

| Limiter | Window | Limit | Applied To |
|---------|--------|-------|------------|
| `loginRateLimiter` | 15 min | 5 requests | `POST /api/auth/login` |
| `authRateLimiter` | 15 min | 10 requests | All `/api/auth/*` routes |
| `apiRateLimiter` | 1 min | 100 requests | All `/api/*` routes (global) |
| `bulkOperationRateLimiter` | 1 hour | 10 requests | Import/export endpoints |
| `passwordResetRateLimiter` | 1 hour | 3 requests | Password reset requests |

Rate limit headers follow the standard `RateLimit-*` format. For deployments behind a reverse proxy, ensure the proxy forwards `X-Forwarded-For` with the real client IP so limits apply per-client rather than per-proxy.

### CORS

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
```

- `credentials: true` is required for the `steward_session` cookie to be sent in cross-origin requests.
- In production, `CORS_ORIGIN` must be the exact URL of the frontend (no trailing slash, correct scheme and port).
- Wildcard `*` is rejected at startup in `NODE_ENV=production`.

### JWT and Cookie Security

Sessions use httpOnly cookies named `steward_session`. Cookie options in production:

```
HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

- `Secure` is set automatically when `NODE_ENV=production`. Ensure the reverse proxy sets `X-Forwarded-Proto: https`.
- `SameSite=Strict` prevents the session cookie from being sent in cross-site requests, mitigating CSRF.
- The API also accepts `Authorization: Bearer <token>` headers as a fallback for non-browser API clients.

### In-Memory Token Blacklist — Production Limitation

**Known limitation:** When a user logs out, the token's `jti` (unique ID) is added to an in-memory array in `backend/src/lib/security.ts`. This array is cleared on backend restart, meaning logged-out tokens remain valid until natural expiry (default: 7 days).

**Recommended fix for production:**

**Option A — Redis blacklist**

Install `ioredis` and replace the in-memory store in `backend/src/lib/security.ts`:

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function blacklistToken(jti: string, expiresAt: Date): Promise<void> {
  const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  if (ttlSeconds > 0) {
    await redis.set(`blacklist:${{jti}}`, '1', 'EX', ttlSeconds);
  }
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  return (await redis.exists(`blacklist:${{jti}}`)) === 1;
}
```

Add `REDIS_URL` to your environment (e.g., `redis://localhost:6379`).

**Option B — Database table**

Add a migration with a `RevokedToken` model in `backend/prisma/schema.prisma`:

```prisma
model RevokedToken {
  jti       String   @id
  expiresAt DateTime

  @@index([expiresAt])
}
```

Replace `blacklistToken` and `isTokenBlacklisted` in `security.ts` with `prisma.revokedToken` calls. Add a periodic cleanup job to delete rows where `expiresAt < now()`.

### Password Policy

All password changes and new account creation enforce:

- Minimum 12 characters
- At least 3 of the 4 character types: lowercase, uppercase, digit, special character
- Rejection of all-same-character strings, sequential runs (123, abc), and the words `password`, `admin`, `qwerty`

---

## CI/CD Integration

### What the GitHub Actions Workflow Does

The workflow at `.github/workflows/ci.yml` runs on every push and pull request to `main`. Five jobs run in parallel:

| Job | Description | Depends On |
|-----|-------------|------------|
| `lint` | Runs `npm run lint` across all workspaces using ESLint | None |
| `typecheck` | Generates Prisma client, then runs `npm run typecheck` | None |
| `test` | Generates Prisma client, deploys migrations, runs `npm test` against a real PostgreSQL 16 service | None |
| `security` | Runs `npm audit --audit-level=high` and greps source for `admin123` | None |
| `build` | Builds the `shared` package then the `frontend` | lint, typecheck |

The `test` job provisions PostgreSQL 16 as a GitHub Actions service container:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: stewardchms_test
```

Test environment variables:

```yaml
env:
  DATABASE_URL: postgresql://test:test@localhost:5432/stewardchms_test
  JWT_SECRET: test-secret-for-ci-only
  NODE_ENV: test
```

The `security` job runs `npm audit` with `continue-on-error: true` (reports but does not block on advisories). It also greps for `admin123` in TypeScript source files and emits a warning if found.

### Adding a Deploy Step

Extend the workflow with a `deploy` job that runs after all checks pass on `main`:

```yaml
deploy:
  name: Deploy
  runs-on: ubuntu-latest
  needs: [lint, typecheck, test, build]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - uses: actions/checkout@v4

    - name: Deploy to production via SSH
      uses: appleboy/ssh-action@v1
      with:
        host: ${{ secrets.DEPLOY_HOST }}
        username: ${{ secrets.DEPLOY_USER }}
        key: ${{ secrets.DEPLOY_KEY }}
        script: |
          cd /opt/stewardchms
          git pull origin main
          docker compose --env-file docker.env up -d --build
          docker compose --env-file docker.env run --rm migrate
```

### Required GitHub Actions Secrets

Add these under **Settings → Secrets and variables → Actions** in the repository:

| Secret | Used By | Description |
|--------|---------|-------------|
| `DEPLOY_HOST` | deploy job | Hostname or IP of the production server |
| `DEPLOY_USER` | deploy job | SSH username on the production server |
| `DEPLOY_KEY` | deploy job | Private SSH key (PEM format) for the deploy user |

Production secrets (`JWT_SECRET`, `DATABASE_URL`, `POSTGRES_PASSWORD`, `STRIPE_WEBHOOK_SECRET`) must **not** be stored in GitHub Actions. They live exclusively in the `docker.env` file on the production host.
