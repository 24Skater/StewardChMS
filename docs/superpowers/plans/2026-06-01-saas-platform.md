# StewardChMS — SaaS Hosted Platform Plan

**Date:** 2026-06-01  
**Scope:** Turn StewardChMS into a self-service hosted SaaS product  
**Author:** Emerson Ramos

---

## What We Are Building

Two systems that work together:

1. **StewardChMS** (already built) — the church management app. Each church gets their own isolated Docker instance.
2. **StewardChMS Control Plane** (new repo) — the platform layer that handles signups, billing, automated provisioning, and lifecycle management.

A third component — the **marketing website** — will be built on Hostinger/WordPress separately and simply links to the control plane signup flow. No custom code needed there beyond a CTA button.

---

## Business Model

- **Pricing target:** $30–$100/month per church
- **Architecture:** One Docker Compose stack per church on shared Hetzner servers
- **Subdomain model:** `{church}.stewardchms.com` at launch; custom domains added later
- **Gross margin at $50/mo, 20 churches:** ~$950/month after ~$33/month infrastructure

---

## System Architecture

### Happy Path (New Customer)

```
Visitor → stewardchms.com (WordPress) → "Get Started" CTA
  → controlplane.stewardchms.com/signup (Node.js form)
  → Stripe Checkout
  → Stripe webhook: customer.subscription.created
  → Control plane provisions Docker stack on Hetzner
  → Traefik picks up new subdomain automatically
  → Migrations + seed run
  → Welcome email sent via Resend (with login URL)
  → Church admin visits trinity.stewardchms.com
  → Completes setup wizard → LIVE
```

### Infrastructure Topology

```
stewardchms.com          (Hostinger WordPress — marketing)
controlplane.stewardchms.com  (Hetzner CX22 — control plane app)

app1.stewardchms.com     (Hetzner CX42 — church instances)
  └─ Traefik container   (wildcard SSL for *.stewardchms.com)
  └─ trinity_network
      ├─ trinity_db       (postgres:16-alpine)
      ├─ trinity_backend  (Express API)
      └─ trinity_frontend (nginx + React SPA)
  └─ gracelife_network
      ├─ gracelife_db
      ├─ gracelife_backend
      └─ gracelife_frontend
  └─ ... (up to ~25–30 churches per server)

app2.stewardchms.com     (add when app1 hits ~20 churches)
```

### Server Specs and Costs

| Server | Hetzner Plan | vCPU | RAM | Cost/mo | Purpose |
|--------|-------------|------|-----|---------|---------|
| Control plane | CX22 | 2 | 4 GB | ~$5 | Control plane app + meta DB |
| App server 1 | CX42 | 8 | 32 GB | ~$28 | Church instances (~25 churches) |
| App server 2+ | CX42 | 8 | 32 GB | ~$28 | Add when app1 hits 20 churches |
| Object storage | Hetzner S3 | — | — | ~$5 | Automated DB backups |

---

## Phase 1 — Pre-Launch Fixes to StewardChMS

These must be done before the first paying customer goes live. All changes are in the **StewardChMS repo**.

### Fix 1: Token Blacklist → Database Table

**Problem:** Logged-out JWT tokens remain valid after a backend restart (in-memory blacklist is wiped).  
**File:** `backend/src/lib/security.ts` + `backend/prisma/schema.prisma`

**Steps:**

1. Add to `backend/prisma/schema.prisma`:
```prisma
model RevokedToken {
  jti       String   @id
  expiresAt DateTime

  @@index([expiresAt])
}
```

2. Run migration:
```bash
npm run db:migrate -w backend
# name the migration: add_revoked_tokens
```

3. Replace in-memory functions in `backend/src/lib/security.ts`:
```typescript
export async function blacklistToken(jti: string, expiresAt: Date): Promise<void> {
  await prisma.revokedToken.create({ data: { jti, expiresAt } });
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const token = await prisma.revokedToken.findUnique({ where: { jti } });
  return token !== null;
}
```

4. Add a nightly cleanup job (cron or a startup interval) to delete expired rows:
```typescript
await prisma.revokedToken.deleteMany({
  where: { expiresAt: { lt: new Date() } }
});
```

### Fix 2: Email — Wire in Resend

**Problem:** `EmailStubProvider` only logs to console. Password resets, welcome emails, and notifications never send.  
**Service:** [Resend](https://resend.com) — free tier 3,000/mo, then $20/mo for 50k  
**File:** `backend/src/providers/messaging/email-stub.ts` (replace) + new `email-resend.ts`

**Steps:**

1. Sign up at resend.com, get API key, verify your sending domain (`mail.stewardchms.com`)

2. Install in backend:
```bash
npm install resend -w backend
```

3. Create `backend/src/providers/messaging/email-resend.ts` implementing the existing `MessageProvider` interface

4. In the control plane provisioning step, inject `RESEND_API_KEY` as an env var into each church's backend container — each church uses your Resend account (their FROM address is `noreply@stewardchms.com`)

5. Update the setup wizard email step to default to Resend (no configuration needed from church admin)

### Fix 3: Health Check — Include Database

**Problem:** `GET /api/health` only confirms the Node process is alive. Doesn't catch DB connection failures.  
**File:** `backend/src/routes/` (wherever health is defined)

**Change:** Add a `SELECT 1` Prisma call to the health endpoint. Return `503` if it fails. The control plane monitoring relies on this to detect degraded instances.

```typescript
try {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', db: 'ok', timestamp: new Date() });
} catch {
  res.status(503).json({ status: 'degraded', db: 'unreachable', timestamp: new Date() });
}
```

---

## Phase 2 — Infrastructure Setup (Hetzner)

Do this before building the control plane so you have a real environment to test against.

### Step 1: Hetzner Account + Servers

1. Create account at hetzner.com
2. Provision **CX22** (control plane server) — Ubuntu 24.04 LTS
3. Provision **CX42** (app server 1) — Ubuntu 24.04 LTS
4. Create a **Hetzner private network** connecting both servers (`10.0.0.0/16`)
5. Assign floating IPs to both servers (so IPs don't change on reboot)
6. Add SSH keys, configure UFW firewall (allow 22, 80, 443 only from public)

### Step 2: DNS Setup

Add to your DNS (wherever stewardchms.com is managed):

```
A     stewardchms.com         → control plane server IP
A     controlplane.stewardchms.com → control plane server IP
A     *.stewardchms.com       → app server 1 IP
```

The wildcard `*.stewardchms.com` catches all church subdomains and routes to the app server.

### Step 3: Docker + Traefik on App Server 1

Install Docker on app server 1, then deploy Traefik:

```yaml
# traefik/docker-compose.yml on app server 1
services:
  traefik:
    image: traefik:v3
    command:
      - --api.insecure=false
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.dnschallenge=true
      - --certificatesresolvers.letsencrypt.acme.dnschallenge.provider=hetzner
      - --certificatesresolvers.letsencrypt.acme.email=you@email.com
      - --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
    environment:
      - HETZNER_API_KEY=${HETZNER_DNS_API_KEY}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
```

Traefik uses the Hetzner DNS API to automatically issue and renew the wildcard cert for `*.stewardchms.com`.

### Step 4: Docker on Control Plane Server

Install Docker. The control plane app itself runs as a Docker container here.

---

## Phase 3 — Control Plane App (New Repo)

**Repo name:** `stewardchms-platform` (separate from the main app repo)  
**Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL (same stack as StewardChMS)  
**Runs on:** Control plane server (CX22)

### Meta Database Schema

```prisma
model Tenant {
  id                   String    @id @default(cuid())
  subdomain            String    @unique  // "trinity"
  churchName           String
  adminEmail           String
  adminName            String
  status               TenantStatus @default(PROVISIONING)
  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?   @unique
  appServerHost        String    // "app1.stewardchms.com"
  dockerNetwork        String    // "stewardchms_trinity_network"
  provisionedAt        DateTime?
  pausedAt             DateTime?
  cancelledAt          DateTime?
  deleteAfter          DateTime? // set 30 days after cancellation
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
}

enum TenantStatus {
  PROVISIONING
  ACTIVE
  PAUSED
  CANCELLED
}
```

### API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Redirect to WordPress marketing site |
| GET | `/signup` | Signup form (church name, admin email, subdomain) |
| POST | `/signup` | Validate → create Stripe Checkout session → redirect |
| GET | `/signup/success` | Post-payment landing ("provisioning your instance...") |
| POST | `/webhooks/stripe` | Handle all Stripe events |
| GET | `/dashboard` | Customer portal (login required) |
| GET | `/dashboard/billing` | Redirect to Stripe Customer Portal |
| GET | `/api/health` | Control plane health check |

### Stripe Webhook Handlers

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Trigger provisioning |
| `invoice.payment_succeeded` | If paused → unpause (restart containers) |
| `invoice.payment_failed` | Pause tenant (stop containers, preserve data) |
| `customer.subscription.deleted` | Set `cancelledAt`, set `deleteAfter` = now + 30 days |

### Provisioning Engine

The provisioning engine runs on the **app server** (not the control plane server). The control plane triggers it via SSH command execution after a successful Stripe webhook.

**Provisioning script** (`scripts/provision-tenant.sh`) runs on the app server:

```bash
#!/bin/bash
TENANT=$1          # "trinity"
ADMIN_EMAIL=$2
ADMIN_PASSWORD=$3  # randomly generated, sent in welcome email
DB_PASSWORD=$4     # randomly generated
JWT_SECRET=$5      # randomly generated (openssl rand -hex 32)

docker network create stewardchms_${TENANT}_network

docker run -d \
  --name ${TENANT}_db \
  --network stewardchms_${TENANT}_network \
  -e POSTGRES_DB=stewardchms \
  -e POSTGRES_USER=steward \
  -e POSTGRES_PASSWORD=${DB_PASSWORD} \
  -v ${TENANT}_pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

# wait for db to be healthy, then run backend + frontend containers
# with Traefik labels for subdomain routing
```

Each container gets Traefik labels:
```
traefik.enable=true
traefik.http.routers.trinity-fe.rule=Host(`trinity.stewardchms.com`)
traefik.http.routers.trinity-fe.tls.certresolver=letsencrypt
```

**After provisioning completes:**
1. Health check passes on `https://trinity.stewardchms.com/api/health`
2. Update tenant status to `ACTIVE` in meta DB
3. Send welcome email via Resend:
   - Login URL: `https://trinity.stewardchms.com`
   - Admin email + temporary password
   - Link to docs/setup guide

### Customer Portal (Dashboard)

Simple auth: magic link via Resend to the admin email on file. No password needed.

Pages:
- `/dashboard` — instance status, subdomain, plan name, next billing date
- `/dashboard/billing` — redirects to Stripe Customer Portal (card updates, invoices, plan changes)
- `/dashboard/backup` — "Request backup" button → triggers `pg_dump` → emails download link

---

## Phase 4 — Operations

### Automated Backups

Cron job on each app server, runs nightly at 2am:

```bash
# For each active tenant:
docker exec ${TENANT}_db pg_dump -U steward stewardchms \
  | gzip > /tmp/${TENANT}-$(date +%Y%m%d).sql.gz

# Upload to Hetzner Object Storage (S3-compatible):
aws s3 cp /tmp/${TENANT}-*.sql.gz s3://stewardchms-backups/${TENANT}/ \
  --endpoint-url https://your-region.your-objectstorage.com

# Delete local temp file
rm /tmp/${TENANT}-*.sql.gz
```

Retention: 30 daily backups per tenant. Hetzner Object Storage costs ~$5/month for all tenants combined.

### Rolling Upgrades

When you push a new version of StewardChMS, the control plane runs an upgrade script against all active tenants sequentially:

```
for each active tenant:
  1. Pull new backend + frontend images
  2. Stop frontend container
  3. Run: docker exec {tenant}_backend npx prisma migrate deploy
  4. Restart backend container → wait for health check
  5. Restart frontend container → wait for health check
  6. Move to next tenant
```

~30 seconds downtime per church. Schedule during off-peak hours.

### Monitoring

Control plane polls `GET /api/health` on every active tenant every 5 minutes. If a tenant fails 3 consecutive checks:
1. Auto-restart all 3 containers for that tenant
2. Send alert email to you (operator) via Resend
3. If still failing after restart → send "degraded" notice to church admin

Add [Better Uptime](https://betteruptime.com) (free tier) once you have 10+ churches.

### Failed Payment Flow

```
invoice.payment_failed webhook received
  → stop backend + frontend containers (DB container stays running — data preserved)
  → update tenant status to PAUSED
  → send email to admin: "Payment failed — update card to restore access"
  → (Stripe retries automatically on days 3, 5, 7)

invoice.payment_succeeded webhook received (after retry)
  → restart backend + frontend containers
  → update tenant status to ACTIVE
  → send email: "Access restored"

After 7 days unpaid → send final warning
After 14 days unpaid → subscription cancelled by Stripe → 30-day grace period starts
After 44 days unpaid total → destroy containers + volumes + remove subdomain
```

---

## Phase 5 — Custom Domain Support (Post-Launch)

After launch, when churches want `chms.trinitybapt.org` instead of `trinity.stewardchms.com`:

1. Church admin enters their custom domain in the customer portal
2. Control plane shows them DNS instructions: `CNAME chms.trinitybapt.org → trinity.stewardchms.com`
3. Control plane polls DNS until CNAME is live
4. Adds a new Traefik label to the frontend container: `Host('chms.trinitybapt.org')`
5. Traefik automatically issues a separate Let's Encrypt cert for that domain
6. Both `trinity.stewardchms.com` and `chms.trinitybapt.org` work simultaneously

No server config changes needed — Traefik handles it automatically via Docker labels.

---

## Build Order (Recommended Sequence)

### Sprint 1 — Foundation (do in StewardChMS repo)
- [ ] Fix 1: Token blacklist → DB table (`RevokedToken` migration)
- [ ] Fix 2: Resend email provider (replace stub)
- [ ] Fix 3: Health check includes DB query
- [ ] Test: `docker compose up` full stack locally, verify all three fixes

### Sprint 2 — Infrastructure
- [ ] Create Hetzner account, provision CX22 + CX42
- [ ] Set up private network, floating IPs, SSH keys, UFW
- [ ] Configure DNS (A records + wildcard)
- [ ] Deploy Traefik on CX42 with wildcard SSL for `*.stewardchms.com`
- [ ] Manually deploy one test church instance on CX42, confirm subdomain + SSL works

### Sprint 3 — Control Plane (new repo: `stewardchms-platform`)
- [ ] Scaffold Node.js + Express + TypeScript + Prisma project
- [ ] Create `Tenant` model + meta DB
- [ ] Build signup form + Stripe Checkout integration
- [ ] Build Stripe webhook handler (subscription.created → queue provisioning)
- [ ] Build provisioning script (`provision-tenant.sh` on app server)
- [ ] Test full flow: signup → Stripe → provision → live subdomain
- [ ] Build customer portal (magic link auth + dashboard + billing redirect)

### Sprint 4 — Operations
- [ ] Automated backup cron job + Hetzner Object Storage
- [ ] Monitoring health check poller + alert emails
- [ ] Rolling upgrade script
- [ ] Failed payment pause/resume flow
- [ ] "Request backup" in customer portal

### Sprint 5 — Launch Prep
- [ ] WordPress site on Hostinger with pricing page + CTA → controlplane signup URL
- [ ] Write onboarding email sequence (welcome, day 3 tips, day 7 check-in)
- [ ] Internal runbook: how to manually intervene on a broken tenant
- [ ] Soft launch: 2–3 test churches (friends/contacts) before public launch

---

## Key Files in StewardChMS Repo (Context for Fixes)

| Fix | File |
|-----|------|
| Token blacklist | `backend/src/lib/security.ts` |
| Prisma schema | `backend/prisma/schema.prisma` |
| Email stub to replace | `backend/src/providers/messaging/email-stub.ts` |
| MessageProvider interface | `backend/src/providers/messaging/` |
| Health check endpoint | Find in `backend/src/routes/` |
| Docker Compose reference | `docker-compose.yml` + `docker.env` |
| Deployment docs | `docs/deployment.md` |

---

## External Services Needed

| Service | Purpose | Cost |
|---------|---------|------|
| [Hetzner](https://hetzner.com) | Servers + object storage | ~$33–38/mo to start |
| [Resend](https://resend.com) | Transactional email | Free → $20/mo |
| [Stripe](https://stripe.com) | Subscription billing | 2.9% + $0.30/transaction |
| [Hostinger](https://hostinger.com) | WordPress marketing site | Already planned |
| [Better Uptime](https://betteruptime.com) | Uptime monitoring (add later) | Free tier |

---

## Notes

- The control plane (`stewardchms-platform`) is a **separate git repo** from the main app
- Each church's Docker containers are named with the subdomain as prefix (e.g. `trinity_db`, `trinity_backend`, `trinity_frontend`) for easy identification on the server
- Never store Stripe secret keys or JWT secrets in the control plane repo — use environment variables on the server
- The WordPress site only needs a "Get Started" button that links to `https://controlplane.stewardchms.com/signup`
- Stripe Customer Portal handles all billing self-service (card updates, cancellations, invoice history) — you don't need to build any of that yourself
