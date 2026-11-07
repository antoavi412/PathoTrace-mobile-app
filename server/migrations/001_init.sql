-- PathoTrace initial schema.
-- Plain PostgreSQL 16 compatible; TimescaleDB is used when available.

-- ---------------------------------------------------------------------------
-- Farms and users
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  phone text,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'farmer'
    CHECK (role IN ('farmer', 'veterinarian', 'cooperative', 'admin')),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
  ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_farm_idx ON users (farm_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id);

-- ---------------------------------------------------------------------------
-- Cattle, assessments, alerts and clinical records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cattle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  tag_id text NOT NULL,
  name text,
  breed text,
  age_months int CHECK (age_months IS NULL OR age_months >= 0),
  lactation_number int CHECK (lactation_number IS NULL OR lactation_number >= 0),
  lactation_stage text,
  days_in_milk int CHECK (days_in_milk IS NULL OR days_in_milk >= 0),
  risk_status text NOT NULL DEFAULT 'unknown'
    CHECK (risk_status IN ('low', 'medium', 'high', 'unknown')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'dead', 'archived')),
  notes text,
  last_assessment_at timestamptz,
  last_assessment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farm_id, tag_id)
);

CREATE INDEX IF NOT EXISTS cattle_farm_status_idx ON cattle (farm_id, status);
CREATE INDEX IF NOT EXISTS cattle_farm_risk_idx ON cattle (farm_id, risk_status);
CREATE INDEX IF NOT EXISTS cattle_search_idx ON cattle (lower(tag_id), lower(coalesce(name, '')));

CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  cow_id uuid NOT NULL REFERENCES cattle(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('low', 'medium', 'high')),
  probability double precision,
  model_version text,
  milk_yield_liters double precision NOT NULL DEFAULT 0,
  somatic_cell_count double precision NOT NULL DEFAULT 0,
  milk_temperature_c double precision NOT NULL DEFAULT 0,
  days_in_milk int NOT NULL DEFAULT 0,
  lactation_number int NOT NULL DEFAULT 1,
  note text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessments_farm_created_idx ON assessments (farm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assessments_cow_created_idx ON assessments (cow_id, created_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  cow_id uuid NOT NULL REFERENCES cattle(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('low', 'medium', 'high')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_farm_created_idx ON alerts (farm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_cow_idx ON alerts (cow_id);

CREATE TABLE IF NOT EXISTS health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  cow_id uuid NOT NULL REFERENCES cattle(id) ON DELETE CASCADE,
  kind text NOT NULL
    CHECK (kind IN ('checkup', 'illness', 'treatment', 'observation', 'vaccination')),
  title text NOT NULL,
  description text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_records_cow_idx ON health_records (cow_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  cow_id uuid NOT NULL REFERENCES cattle(id) ON DELETE CASCADE,
  veterinarian_id uuid REFERENCES users(id) ON DELETE SET NULL,
  note text NOT NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS observations_idempotency_unique
  ON observations (veterinarian_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS observations_cow_idx ON observations (cow_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vet_cattle_assignments (
  vet_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cow_id uuid NOT NULL REFERENCES cattle(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vet_id, cow_id)
);

-- ---------------------------------------------------------------------------
-- Devices
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  serial_number text NOT NULL UNIQUE,
  type text NOT NULL,
  model text,
  firmware text,
  status text NOT NULL DEFAULT 'offline'
    CHECK (status IN ('online', 'offline', 'maintenance')),
  battery_percent int CHECK (battery_percent IS NULL OR battery_percent BETWEEN 0 AND 100),
  signal_strength int,
  last_seen_at timestamptz,
  token_hash text NOT NULL,
  expected_interval_seconds int NOT NULL DEFAULT 900
    CHECK (expected_interval_seconds > 0),
  secret_rotated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS devices_farm_last_seen_idx ON devices (farm_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS devices_token_idx ON devices (token_hash);

CREATE TABLE IF NOT EXISTS device_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  cow_id uuid NOT NULL REFERENCES cattle(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS device_assignments_active_device
  ON device_assignments (device_id) WHERE removed_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS device_assignments_active_cow
  ON device_assignments (cow_id) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS device_assignments_cow_idx ON device_assignments (cow_id);

-- ---------------------------------------------------------------------------
-- Readings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS readings (
  id bigserial,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  cow_id uuid REFERENCES cattle(id) ON DELETE SET NULL,
  metric text NOT NULL,
  value double precision NOT NULL,
  unit text NOT NULL,
  quality text NOT NULL DEFAULT 'good'
    CHECK (quality IN ('good', 'suspect', 'missing')),
  recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  batch_id uuid,
  PRIMARY KEY (id, recorded_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS readings_dedupe
  ON readings (device_id, metric, recorded_at);
CREATE INDEX IF NOT EXISTS readings_device_time
  ON readings (device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS readings_cow_metric_time
  ON readings (cow_id, metric, recorded_at DESC);
CREATE INDEX IF NOT EXISTS readings_recorded_brin
  ON readings USING brin (recorded_at);

-- Enable TimescaleDB when the extension is present. Falls back to plain
-- PostgreSQL tables with BRIN indexes otherwise.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb') THEN
    CREATE EXTENSION IF NOT EXISTS timescaledb;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TimescaleDB extension not enabled: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('readings', 'recorded_at', if_not_exists => TRUE);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create readings hypertable: %', SQLERRM;
END $$;

CREATE TABLE IF NOT EXISTS ingest_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  boot_id text,
  sequence bigint,
  source text,
  accepted int NOT NULL DEFAULT 0,
  duplicates int NOT NULL DEFAULT 0,
  rejected int NOT NULL DEFAULT 0,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingest_batches_device_idx
  ON ingest_batches (device_id, received_at DESC);

CREATE TABLE IF NOT EXISTS device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS device_events_farm_idx
  ON device_events (farm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS device_events_device_idx
  ON device_events (device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS hardware_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  cow_id uuid REFERENCES cattle(id) ON DELETE SET NULL,
  rule_key text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS hardware_alerts_open_unique
  ON hardware_alerts (device_id, rule_key) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS hardware_alerts_farm_idx
  ON hardware_alerts (farm_id, status, opened_at DESC);

-- ---------------------------------------------------------------------------
-- Jobs and audit
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS jobs (
  id bigserial PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  run_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS jobs_ready ON jobs (status, run_at);
CREATE INDEX IF NOT EXISTS jobs_type_status ON jobs (type, status);

CREATE TABLE IF NOT EXISTS job_schedules (
  name text PRIMARY KEY,
  interval_seconds int NOT NULL,
  last_enqueued_at timestamptz,
  last_run_at timestamptz
);

INSERT INTO job_schedules (name, interval_seconds)
VALUES
  ('device-silence', 60),
  ('alert-evaluate', 60),
  ('cleanup', 86400)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  actor_type text NOT NULL,
  actor_id text,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);
