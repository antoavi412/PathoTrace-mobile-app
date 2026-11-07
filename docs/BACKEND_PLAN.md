# PathoTrace Backend — Hardware Ingestion & API Plan

**Date:** 7 November 2026
**Status:** Phase 1 scaffolded (code written). Dependencies NOT installed — `npm install`
has not been run, per the no-installs constraint. Next step: install deps, run migrations,
then verify with `npm run typecheck` and `npm test`.
**Scope:** Backend for cellular cattle-monitoring devices (4G Cat-1 primary, 2G fallback) plus
the API required by the PathoTrace mobile app.

---

## 0. Decisions

| Decision | Choice |
| --- | --- |
| Backend shape | **One unified backend** for app users and hardware devices |
| Architecture | Modular monolith, not microservices |
| Runtime | Node.js 22 + TypeScript |
| HTTP framework | Fastify + Zod validation |
| Database | PostgreSQL 16 + TimescaleDB extension |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Device transport | HTTPS JSON batch ingestion first |
| Device radio | 4G Cat-1 / Cat-1 bis primary; 2G fallback only where needed |
| User auth | JWT access token + refresh token |
| Device auth | Per-device token over TLS |
| Background jobs | **Postgres `jobs` table + in-process runner** |
| Rate limiting | In-memory for v1 (single instance) |
| Export | Streaming CSV first; XLSX later |
| Deployment | Docker Compose on an India-region VPS + Caddy TLS |
| **Redis** | **Not used in v1. Add later only if needed.** |
| **BullMQ** | **Not used in v1.** |
| MQTT | Deferred |
| Object storage | Deferred; stream CSV first |
| Kubernetes / Kafka | Not planned |

**Explicit constraint:** v1 must run with only `api`, `postgres` and `caddy` containers. No
Redis service, no BullMQ worker, no extra infrastructure.

---

## 1. MVP scope

### In scope

- User login, refresh, logout, farms and roles.
- Cattle CRUD for farmers.
- Device registry and cow/farm assignment.
- HTTPS batch ingestion with validation and deduplication.
- Device status: online/offline, battery, signal, last seen, firmware.
- Readings query API with time windows and downsampling.
- Device events and basic alerts:
  - device silent/offline,
  - low battery,
  - metric threshold.
- CSV export of filtered readings.
- Device simulator for development and load testing.
- Docker deployment, migrations, backups, health checks and logs.

### Out of scope for v1

- Redis, BullMQ, Kafka, MQTT broker.
- Firmware OTA.
- Push notifications.
- Object storage / signed export URLs.
- XLSX generation (CSV first).
- Advanced ML or anomaly detection.
- Multi-region deployment.
- Kubernetes.
- Billing/subscriptions.

---

## 2. Architecture

```text
Cellular device (2G/4G + SIM)
        |
        | HTTPS + device token
        v
Caddy (TLS, reverse proxy)
        |
        v
PathoTrace API (Node.js + Fastify)
  |-- auth module
  |-- farms / users module
  |-- cattle module
  |-- devices module
  |-- ingestion module
  |-- readings module
  |-- alerts module
  |-- exports module
  |-- in-process job runner
        |
        +--> PostgreSQL 16 + TimescaleDB
        |      - relational data
        |      - readings (hypertable)
        |      - jobs table
        |
        +--> local disk (temporary CSV files, if needed)

Mobile app ---> same API ---> Observatory / cow readings / CSV
```

### Why a modular monolith

- One deployable unit, one database, one set of migrations.
- Easy to run on a small VPS.
- Modules can be extracted later if load justifies it.
- No distributed transactions, no message broker, no Redis.

### Single-process job runner

The API process also runs a lightweight job loop using `setInterval` and a Postgres advisory
lock. This replaces Redis/BullMQ for v1. If the app ever runs multiple API instances, the
advisory lock ensures only one runner processes jobs. Redis can replace this later without
changing the job handlers.

---

## 3. Technology stack

### Runtime dependencies (planned; not installed yet)

| Package | Purpose |
| --- | --- |
| `fastify` | HTTP server |
| `@fastify/cors` | CORS for the mobile/web client |
| `@fastify/rate-limit` | Basic rate limiting (in-memory store) |
| `zod` | Request and payload validation |
| `drizzle-orm` | Typed database access |
| `pg` | PostgreSQL driver |
| `jose` | JWT signing/verification |
| `argon2` or `bcrypt` | Password hashing |
| `pino` | Structured logging |
| `dotenv` | Environment loading (or Node's built-in env) |

### Dev dependencies

| Package | Purpose |
| --- | --- |
| `typescript` | Types |
| `tsx` | Local execution |
| `vitest` | Unit/integration tests |
| `drizzle-kit` | Migrations |
| `supertest` or Fastify inject | API tests |
| `@types/node`, `@types/pg` | Types |

**Not included:** `redis`, `ioredis`, `bullmq`, `@fastify/redis`, `mqtt`, `kafkajs`.

---

### Implementation status (Phase 1)

Phase 1 code has been scaffolded under `server/` but dependencies are **not installed** and the
code has **not been typechecked or tested** yet. The following files exist:

| Area | Files |
| --- | --- |
| Config & env | `src/config/env.ts`, `src/config/metrics.ts` |
| Database | `src/db/client.ts`, `src/db/migrate.ts`, `migrations/001_init.sql` |
| Lib | `src/lib/errors.ts`, `src/lib/security.ts`, `src/lib/auth.ts`, `src/lib/audit.ts`, `src/lib/csv.ts`, `src/lib/time.ts`, `src/lib/serializers.ts`, `src/lib/hardware-alerts.ts` |
| Auth | `src/modules/auth/service.ts`, `src/modules/auth/routes.ts` |
| Users | `src/modules/users/routes.ts` |
| Cattle | `src/modules/cattle/serialize.ts`, `src/modules/cattle/routes.ts` |
| Assessments | `src/modules/assessments/serialize.ts`, `src/modules/assessments/routes.ts`, `src/modules/assessments/risk.ts` |
| Alerts | `src/modules/alerts/routes.ts` |
| Health | `src/modules/health/routes.ts` |
| Devices | `src/modules/devices/serialize.ts`, `src/modules/devices/routes.ts` |
| Ingest | `src/modules/ingest/routes.ts` |
| Readings | `src/modules/readings/routes.ts` |
| Exports | `src/modules/exports/routes.ts` |
| Jobs | `src/jobs/runner.ts`, `src/jobs/enqueue.ts`, `src/jobs/handlers/*.ts` |
| App entry | `src/app.ts`, `src/server.ts`, `src/routes/health.ts` |
| Types | `src/types/domain.ts`, `src/types/fastify.d.ts` |
| Scripts | `scripts/seed-demo.ts`, `scripts/simulate-devices.ts` |
| Tests | `test/health.test.ts`, `test/db-setup.ts`, `vitest.config.ts` |
| Ops | `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.env.example`, `package.json`, `tsconfig.json` |

To verify Phase 1:

```bash
cd server
npm install
npm run typecheck
npm run migrate   # requires a running Postgres
npm test          # requires a running Postgres
```

---

### Database

- PostgreSQL 16.
- TimescaleDB extension for the `readings` table.
- If TimescaleDB is unavailable, use plain Postgres with monthly range partitions and BRIN
  indexes. The schema should not depend on Timescale-only features for correctness.
- `time_bucket()` is used for downsampling when available; otherwise `date_trunc`.

---

## 4. Repository layout

Keep the backend in the same repository under `server/`, or move it to its own repository later.
For now, a sibling folder keeps the mobile app and API contracts together.

```text
server/
  src/
    app.ts                    # Fastify instance, plugins, routes
    server.ts                 # process entry point
    config/
      env.ts                  # validated environment variables
      metrics.ts              # allowed metric names/ranges
    db/
      client.ts               # pg pool + Drizzle
      schema.ts               # tables
      migrations/
    modules/
      auth/
      users/
      farms/
      cattle/
      devices/
      ingest/
      readings/
      alerts/
      exports/
    jobs/
      runner.ts               # Postgres job loop + advisory lock
      handlers/
        device-silence.ts
        alert-evaluate.ts
        export-csv.ts
        cleanup.ts
    lib/
      errors.ts
      logger.ts
      rate-limit.ts
      security.ts
      time.ts
    routes/
      health.ts
      v1.ts
  test/
    unit/
    integration/
  scripts/
    simulate-devices.ts       # fake 50-500 devices
    seed-demo.ts
  docker-compose.yml
  Dockerfile
  Caddyfile
  .env.example
  package.json
  tsconfig.json
```

---

## 5. Database schema

### Core tables

```sql
farms (
  id uuid primary key,
  name text not null,
  location text,
  phone text,
  created_at timestamptz not null default now()
);

users (
  id uuid primary key,
  farm_id uuid references farms(id),
  email text unique not null,
  password_hash text not null,
  name text not null,
  phone text,
  role text not null check (role in ('farmer','veterinarian','cooperative','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

refresh_tokens (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

cattle (
  id uuid primary key,
  farm_id uuid not null references farms(id),
  tag_id text not null,
  name text,
  breed text,
  age_months int,
  lactation_number int,
  lactation_stage text,
  days_in_milk int,
  risk_status text default 'unknown',
  status text not null default 'active',  -- active/sold/dead/archived
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, tag_id)
);

devices (
  id uuid primary key,
  farm_id uuid not null references farms(id),
  serial_number text unique not null,
  type text not null,                     -- collar/ear-tag/bolus/milk-meter
  model text,
  firmware text,
  status text not null default 'offline', -- online/offline/maintenance
  battery_percent int,
  signal_strength int,
  last_seen_at timestamptz,
  token_hash text not null,               -- sha256 of the device token
  expected_interval_seconds int not null default 900,
  secret_rotated_at timestamptz,
  created_at timestamptz not null default now()
);

device_assignments (
  id uuid primary key,
  device_id uuid not null references devices(id) on delete cascade,
  cattle_id uuid not null references cattle(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  removed_at timestamptz
);
```

### Readings

```sql
readings (
  id bigserial,
  device_id uuid not null references devices(id),
  cattle_id uuid references cattle(id),
  metric text not null,
  value double precision not null,
  unit text not null,
  quality text not null default 'good',   -- good/suspect/missing
  recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  batch_id uuid,
  primary key (id, recorded_at)
);
```

With TimescaleDB:

```sql
SELECT create_hypertable('readings', 'recorded_at');
```

If TimescaleDB is unavailable, partition by month:

```sql
-- Example: readings_2026_11 partition
CREATE TABLE readings_2026_11 PARTITION OF readings
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
```

Indexes:

```sql
CREATE UNIQUE INDEX readings_dedupe
  ON readings (device_id, metric, recorded_at);

CREATE INDEX readings_device_time
  ON readings (device_id, recorded_at DESC);

CREATE INDEX readings_cattle_metric_time
  ON readings (cattle_id, metric, recorded_at DESC);

CREATE INDEX devices_farm_last_seen
  ON devices (farm_id, last_seen_at DESC);
```

Retention:

- Raw readings: 24 months by default.
- Timescale compression after 7 days.
- Drop or archive old partitions after retention.
- Keep device and alert history longer.

### Events, alerts, jobs and audit

```sql
device_events (
  id uuid primary key,
  device_id uuid not null references devices(id),
  type text not null,          -- offline/battery-low/threshold/error
  severity text not null,      -- info/warning/critical
  message text not null,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references users(id)
);

alerts (
  id uuid primary key,
  farm_id uuid not null references farms(id),
  device_id uuid references devices(id),
  cattle_id uuid references cattle(id),
  rule_key text not null,      -- device-silent/battery-low/temperature-high
  severity text not null,
  message text not null,
  status text not null default 'open', -- open/resolved
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  acknowledged_at timestamptz,
  unique (device_id, rule_key, status)
);

jobs (
  id bigserial primary key,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending/processing/done/failed
  run_at timestamptz not null default now(),
  attempts int not null default 0,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

CREATE INDEX jobs_ready ON jobs (status, run_at);

audit_log (
  id bigserial primary key,
  actor_type text not null,    -- user/device/system
  actor_id text,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
```

---

## 6. API surface

All app endpoints are under `/v1`. Device ingestion is under `/v1/ingest`.

### Device endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/ingest/readings` | Batch readings upload |
| `POST` | `/v1/ingest/heartbeat` | Optional device heartbeat/status |
| `GET` | `/v1/device/config` | Optional interval/threshold config |

#### `POST /v1/ingest/readings`

Headers:

```http
Authorization: Device <device-token>
Content-Type: application/json
```

Body:

```json
{
  "source": "cellular",
  "bootId": "b7f1",
  "sequence": 1842,
  "recordedAt": "2026-11-07T10:15:00Z",
  "readings": [
    { "metric": "temperature", "value": 38.7, "unit": "C", "quality": "good" },
    { "metric": "activity", "value": 72, "unit": "index", "quality": "good" }
  ]
}
```

Response `202`:

```json
{
  "accepted": 2,
  "duplicates": 0,
  "rejected": 0,
  "batchId": "0f6b...",
  "serverTime": "2026-11-07T10:15:04Z"
}
```

Limits:

- Max 100 readings per batch.
- Max 64 KB request body.
- Max 31 days of backfill per batch.
- Reject timestamps more than 5 minutes in the future.

### App endpoints — hardware

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/devices?farmId=&status=` | Device list |
| `GET` | `/v1/devices/{id}` | Device detail |
| `GET` | `/v1/devices/{id}/readings?metric=&from=&to=&bucket=5m` | Device readings |
| `GET` | `/v1/farms/{id}/devices/status` | Farm summary counts |
| `GET` | `/v1/cattle/{id}/readings?from=&to=` | Cow readings |
| `GET` | `/v1/device-events?status=` | Device events |
| `PATCH` | `/v1/device-events/{id}/ack` | Acknowledge event |
| `POST` | `/v1/devices/{id}/assign` | Assign device to cow |
| `DELETE` | `/v1/devices/{id}/assign` | Unassign |
| `GET` | `/v1/alerts?status=` | Hardware + app alerts |
| `PATCH` | `/v1/alerts/{id}/ack` | Acknowledge alert |
| `GET` | `/v1/exports/readings.csv?from=&to=&deviceId=&cowId=` | Streaming CSV |

### App endpoints — existing mobile contract

The mobile app already expects these paths (configurable through `.env`):

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/auth/login` | Login |
| `POST` | `/v1/auth/logout` | Logout |
| `POST` | `/v1/auth/forgot-password` | Password recovery |
| `GET` | `/v1/cattle` | Paginated herd |
| `GET` | `/v1/cattle/{id}` | Cow detail |
| `POST` | `/v1/cattle` | Create cow |
| `PATCH` | `/v1/cattle/{id}` | Update cow |
| `DELETE` | `/v1/cattle/{id}` | Archive/delete cow |
| `GET` | `/v1/assessments` | Assessment list |
| `POST` | `/v1/assessments` | Create assessment |
| `GET` | `/v1/alerts` | Alert list |
| `PATCH` | `/v1/alerts/{id}` | Mark read |
| `GET` | `/v1/health-records?cowId=` | Health records |
| `GET` | `/v1/observations?cowId=` | Vet observations |
| `POST` | `/v1/observations` | Add observation |

The app's `EXPO_PUBLIC_*_PATH` values will point at these `/v1` paths.

### Error format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid reading payload",
    "details": [{ "path": "readings[0].value", "message": "Expected number" }]
  }
}
```

Status codes: `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.

---

## 7. Ingestion rules

### Validation

- Device token must be valid and not revoked.
- `readings` must contain 1–100 items.
- `metric` must be in the allowed list (`temperature`, `activity`, `rumination`,
  `battery`, `signal`, `milk_yield`, `somatic_cell_count`, `milk_temperature`, plus configured
  custom metrics).
- `value` must be a finite number within the configured range for that metric.
- `unit` must match the metric's expected unit (or be normalized).
- `quality` must be `good`, `suspect` or `missing`.
- `recorded_at` must be valid ISO 8601, not more than 5 minutes in the future, and not older
  than the retention/backfill limit.
- Reject unknown top-level fields? No — ignore them for forward compatibility.

### Idempotency and duplicates

- Unique key: `(device_id, metric, recorded_at)`.
- Insert with `ON CONFLICT DO NOTHING`.
- Count duplicates and return them in the response.
- `bootId` + `sequence` can be stored in `ingest_batches` for diagnostics, but the unique
  reading key is the source of truth.

### Partial acceptance

For v1:

- Validate the whole batch.
- Insert valid readings.
- Return `accepted`, `duplicates`, `rejected` counts and per-item rejection details.
- A rejected item does not fail the whole batch. The device can drop it or retry after
  correction; retries are safe because of idempotency.

### Device clock

- Store both `recorded_at` (device time) and `received_at` (server time).
- Accept a clock skew of ±5 minutes for future timestamps.
- Accept late data within the retention window.
- If the device clock is clearly wrong, mark the reading `quality = 'suspect'` rather than
  silently rewriting device time.

### Backpressure

- Request body limit: 64 KB.
- Batch limit: 100 readings.
- Per-device rate limit: e.g. 12 requests/minute.
- Return `429` with `Retry-After` when exceeded.
- Keep the ingestion handler short; do not run alert evaluation inline.

### No queue in v1

- Insert readings synchronously in a transaction.
- After insert, schedule alert evaluation through the `jobs` table.
- The job runner picks it up within a few seconds.
- Ingestion remains fast and independent of alert complexity.

---

## 8. Device authentication and provisioning

### Token model

- Each device gets a random 32-byte token at provisioning time.
- Store only `sha256(token)` in `devices.token_hash`.
- Device sends `Authorization: Device <token>` over HTTPS.
- Compare hashes in constant time.
- Token rotation endpoint: `POST /v1/devices/{id}/rotate-token` (admin/farmer owner).
- Revoke by setting `token_hash` to a new value or `status = 'maintenance'`.

Why not HMAC for v1: HMAC requires storing a verifiable secret, and older 2G modules handle
extra crypto poorly. A per-device bearer token over TLS is simpler and adequate for v1. HMAC
or mTLS can be added later.

### Provisioning flow

1. Admin/farmer creates a device record in the app or admin panel.
2. Backend generates a token and returns it **once**.
3. A QR code contains `deviceId` + provisioning token.
4. Installer scans the QR in the app; app calls `POST /v1/devices/{id}/assign`.
5. Backend binds the device to a cow and farm.
6. Device is configured with the token via USB/serial/BLE provisioning.

Never put device tokens in the mobile app bundle or logs.

---

## 9. Background jobs without Redis

### How it works

- All async work is a row in `jobs`.
- The API process runs a loop every 2–5 seconds.
- It claims one job with `FOR UPDATE SKIP LOCKED`.
- It executes the handler.
- It marks the job `done` or `failed` with an error.
- A Postgres advisory lock ensures only one runner is active per database.

```sql
SELECT pg_try_advisory_lock(hashtext('pathotrace-job-runner'));
```

Claim query:

```sql
WITH next_job AS (
  SELECT id
  FROM jobs
  WHERE status = 'pending' AND run_at <= now()
  ORDER BY id
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE jobs
SET status = 'processing', locked_at = now(), attempts = attempts + 1
WHERE id = (SELECT id FROM next_job)
RETURNING *;
```

Recovery:

- Jobs stuck in `processing` with `locked_at < now() - interval '5 minutes'` are reset to
  `pending` on startup.

Scheduled work:

| Job type | Schedule | Purpose |
| --- | --- | --- |
| `device-silence` | every 60 s | Mark devices offline; open alerts |
| `alert-evaluate` | every 60 s | Evaluate battery/threshold rules |
| `export-csv` | on demand | Generate large CSV files |
| `cleanup` | daily | Remove old jobs, expired tokens, old exports |

### Limitations of no Redis

- Job throughput is lower than BullMQ but more than enough for hundreds of devices.
- Rate limiting is per API instance, not global.
- No delayed job scheduling beyond `run_at`.
- No pub/sub.

Upgrade path: keep the same job handlers and add Redis/BullMQ later if multi-instance
throughput requires it. No schema change needed.

---

## 10. Alerts

### Rules for v1

| Rule | Condition | Severity |
| --- | --- | --- |
| `device-silent` | No reading for `2 × expected_interval_seconds` | critical |
| `battery-low` | `battery_percent < 20` | warning |
| `temperature-high` | Temperature above configured threshold for 2 consecutive readings | critical |
| `metric-missing` | Expected metric absent in the latest batch | warning |

### Behaviour

- Evaluate every minute.
- Deduplicate by `(device_id, rule_key, status = 'open')`.
- Auto-resolve when the condition clears.
- Acknowledge without resolving.
- Store in `alerts` and mirror as `device_events` when useful for diagnostics.
- The app shows hardware alerts alongside existing risk alerts.

No push notifications in v1. The app shows alerts when opened or refreshed.

---

## 11. CSV export

### Endpoint

```http
GET /v1/exports/readings.csv?from=2026-11-01&to=2026-11-07&farmId=...&deviceId=...&cowId=...
Authorization: Bearer <user-token>
```

Response:

```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="pathotrace-readings-2026-11-01_2026-11-07.csv"
```

### Columns

```text
reading_id, farm_id, device_id, device_serial, cow_id, cow_tag_id,
metric, value, unit, quality, recorded_at_utc, recorded_at_ist, received_at_utc
```

Notes:

- Timestamps in ISO 8601 UTC, plus an IST column for Excel users.
- Include the farm/cow identifiers so the sheet is understandable outside the app.
- Escape commas and quotes correctly.
- Add a UTF-8 BOM for Excel compatibility.

### Limits

- Default max range: 31 days.
- Default max rows: 100,000.
- For larger requests, create an `export-csv` job and expose
  `GET /v1/exports/{id}` for status/download.
- v1 can write large files to `./storage/exports`, with a 24-hour expiry. Object storage is a
  later upgrade.

### XLSX

Not in v1. CSV opens directly in Excel and Google Sheets. Add real `.xlsx` only if multiple
sheets, formatting or formulas are required.

---

## 12. Security

- HTTPS only; HSTS; no plain HTTP in production.
- Passwords hashed with Argon2 (or bcrypt cost ≥ 12).
- Device tokens hashed with SHA-256; never stored in plaintext.
- JWT access tokens short-lived (15 min); refresh tokens stored hashed.
- Farm-scoped authorization on every read/write.
- Role checks: farmer owns farm, vet assigned cows, cooperative read-only, admin global.
- Rate limits on login, ingestion and export.
- Input validation on every endpoint.
- Payload size limits.
- Audit log for login, device assignment, token rotation, cattle delete and export.
- No health data, tokens or passwords in logs.
- Database backups encrypted at rest.
- Secrets in environment variables or a secret manager; never in Git.
- Principle of least privilege for the database user.
- Plan for India's DPDP Act: data minimization, retention limits, deletion request path.

---

## 13. Deployment and operations

### Docker Compose services (v1)

```text
api       Node.js + Fastify (also runs job loop)
db        PostgreSQL 16 + TimescaleDB
caddy     TLS + reverse proxy
```

No Redis, no worker container, no MQTT.

### Environment variables

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://pathotrace:...@db:5432/pathotrace
JWT_SECRET=...
JWT_REFRESH_SECRET=...
DEVICE_TOKEN_PEPPER=...
PUBLIC_BASE_URL=https://api.pathotrace.example
EXPORT_DIR=/app/storage/exports
LOG_LEVEL=info
```

### Server readiness checklist

- [ ] Domain `api.pathotrace.com` + DNS
- [ ] India-region VPS (2 vCPU / 4 GB RAM to start)
- [ ] Docker + Docker Compose installed
- [ ] Caddy TLS working
- [ ] Postgres volume on persistent disk
- [ ] `.env` not committed
- [ ] Daily `pg_dump` backup + tested restore
- [ ] `/health` and `/ready` endpoints
- [ ] Uptime monitor on `/health`
- [ ] Log rotation
- [ ] Firewall: only 80/443 public; Postgres not exposed
- [ ] SSH key-only access
- [ ] Staging environment
- [ ] Migration step in deployment

### CI/CD

- GitHub Actions: install, typecheck, lint, test, build.
- Integration tests use a temporary Postgres service container.
- No Redis service required.
- Deploy: build image, run migrations, restart API.
- Keep migrations backward-compatible for rolling restarts.

### Monitoring

- Structured JSON logs with request IDs.
- Metrics/log lines for: ingestion count, rejected count, duplicates, latency, 5xx rate,
  device silence count, job failures, DB size, disk usage.
- Alert to email/Telegram/Slack when:
  - `/health` fails,
  - ingestion error rate > 1%,
  - job backlog > 100,
  - disk > 80%,
  - device silence spikes.
- Sentry (or similar) optional.

---

## 14. Capacity and performance

At a 15-minute interval:

| Devices | Readings/day | Readings/year | Ingestion rate |
| --- | --- | --- | --- |
| 50 | 4,800 | ~1.75M | ~0.06 req/s |
| 500 | 48,000 | ~17.5M | ~0.56 req/s |
| 5,000 | 480,000 | ~175M | ~5.6 req/s |

This is small for Postgres/Timescale. The VPS will be limited by modem reliability and support
work, not database throughput.

Query strategy:

- Always filter by `farm_id`/`device_id`/`cattle_id` and a time window.
- Default app window: 24 hours; max: 31 days.
- Downsample server-side (`time_bucket`) for charts.
- Paginate with `before`/`after` cursor, not `OFFSET`.
- Never `SELECT *` from readings into the app.
- Cache the last-known device state in `devices` for fast list rendering.
- Use a connection pool (10–20 connections for a small VPS).

---

## 15. Testing

### Unit tests

- Payload validation, metric ranges, timestamp skew.
- Token hashing and constant-time comparison.
- Deduplication logic.
- CSV escaping and date formatting.
- Alert rule evaluation.

### Integration tests

- Login → create cow → create device → assign → ingest → read.
- Duplicate batch is idempotent.
- Invalid batch returns per-item errors.
- Farm scoping: user A cannot see farm B.
- Device token revocation.
- CSV export authorization and content.
- Job runner claims and recovers stale jobs.

### Device simulator

`scripts/simulate-devices.ts`:

- Creates N fake devices (configurable, e.g. 50/500).
- Sends batches every X seconds.
- Randomizes temperature/activity within realistic ranges.
- Supports `--offline` to stop one device and test silence alerts.
- Supports `--duplicate` to test idempotency.
- Supports `--backfill` to test late data.

### Load test

- k6 or a simple Node script.
- Target: 500 devices at 15-minute interval, with bursts of 10×.
- Verify p95 ingestion latency < 300 ms and no dropped batches.

---

## 16. Delivery plan

### Phase 0 — Design (this document)

- Confirm stack, hosting, metrics, intervals and retention.
- Approve API and schema.
- Output: this plan + OpenAPI outline.

### Phase 1 — Foundation (3–4 days)

- Scaffold `server/` (no Redis/BullMQ).
- Docker Compose: api + db + caddy.
- Environment validation.
- Drizzle schema + first migration.
- `/health`, `/ready`.
- User auth (login, refresh, logout).
- Farm/cattle CRUD.
- Seed script and demo data.
- Output: API runs locally and in Docker; app can log in live.

### Phase 2 — Devices and ingestion (3–4 days)

- Device registry and assignment.
- Device token generation/rotation.
- `POST /v1/ingest/readings` with validation and dedupe.
- Device simulator.
- Integration tests.
- Output: simulated devices can send readings.

### Phase 3 — Readings and app integration (3–4 days)

- Query API with time windows and downsampling.
- Device list/status endpoints.
- CSV export endpoint.
- Mobile Observatory integration (against the API).
- Output: app shows device status, readings and CSV export.

### Phase 4 — Alerts, jobs and ops (3–4 days)

- Postgres job runner + advisory lock.
- Device silence, battery and threshold alerts.
- Auto-resolve and acknowledge.
- Backups, monitoring, logs.
- Load test with 500 devices.
- Deploy to staging/production.
- Output: production-ready MVP.

Total: roughly **3–4 weeks for one developer**, **2 weeks for two**.

---

## 17. First code scaffold (when approved)

When we start coding, Phase 1 should produce exactly this:

```text
server/
  package.json
  tsconfig.json
  .env.example
  Dockerfile
  docker-compose.yml
  Caddyfile
  src/
    app.ts
    server.ts
    config/env.ts
    db/client.ts
    db/schema.ts
    modules/health/routes.ts
    modules/auth/routes.ts
    modules/auth/service.ts
    modules/cattle/routes.ts
    lib/errors.ts
    lib/logger.ts
  scripts/
    seed-demo.ts
  test/
    health.test.ts
```

`package.json` dependencies for Phase 1 only:

```text
fastify, @fastify/cors, zod, drizzle-orm, pg, jose, argon2, pino, dotenv
dev: typescript, tsx, vitest, drizzle-kit, @types/node, @types/pg
```

**No Redis. No BullMQ. No MQTT. No S3. No Kubernetes.**

---

## 18. Open questions

1. Is there an existing PathoTrace backend, or is this the first one?
2. Expected devices and farms at launch, and in 12 months.
3. Exact metrics and sampling interval per device.
4. Hosting preference and monthly budget.
5. Should ingest remain HTTPS-only for v1, or is MQTT required soon?
6. Is CSV enough, or is true `.xlsx` required?
7. Who provisions devices — farmer in the app, or an admin panel?
8. Data retention and compliance requirements.
9. Which roles can view hardware data? Farmers, vets, cooperative, all?
10. Is the 2G fallback final, or will all production devices be 4G?
11. Should device data also feed the mastitis assessment model later?
12. What is the expected alert response — in-app only, SMS, or push?

---

## 19. Definition of done for the MVP

- [~] API runs with `docker compose up` using only api + db + caddy. (Dockerfile + docker-compose.yml scaffolded; needs `npm install` + DB to verify.)
- [~] User can log in and manage cattle. (Auth + cattle routes scaffolded; needs install + DB to verify.)
- [~] Device can be created, assigned to a cow and authenticated. (Device routes scaffolded; needs install + DB to verify.)
- [~] Simulated devices ingest readings over HTTPS. (Ingest routes + simulate-devices.ts scaffolded; needs install + DB to verify.)
- [~] Duplicate and invalid batches behave correctly. (Ingest validation/dedupe scaffolded; needs install + DB to verify.)
- [~] App can list devices, show status and read a time window. (Device + readings routes scaffolded; needs install + DB to verify.)
- [~] CSV export works with filters and correct headers. (Export route scaffolded; needs install + DB to verify.)
- [~] Device silence alert opens and auto-resolves. (device-silence job handler scaffolded; needs install + DB to verify.)
- [~] Farm scoping and role permissions are enforced. (assertFarmScope / assertRole in all routes; needs install + DB to verify.)
- [ ] Backups are automated and a restore has been tested. (Not yet implemented.)
- [ ] 500-device load test passes. (Not yet run.)
- [x] No Redis or BullMQ dependency. (Confirmed — Postgres jobs table + in-process runner only.)

---

## 20. Explicitly deferred

| Item | When |
| --- | --- |
| Redis | Only if multi-instance rate limiting/caching or job throughput requires it |
| BullMQ | Only after Redis is introduced |
| MQTT broker | If devices need bidirectional/low-latency messaging |
| Object storage (S3/R2) | When exports or firmware files outgrow local disk |
| XLSX generation | When CSV is not sufficient |
| Push notifications | After in-app alerts are validated |
| Firmware OTA | After device fleet is stable |
| ML/mastitis integration | After readings are flowing reliably |
| Kubernetes | Only at significant scale |
