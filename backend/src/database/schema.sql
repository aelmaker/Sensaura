CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','analyst','operator','viewer')),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verification_token TEXT,
  reset_password_token TEXT,
  reset_password_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  access_expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_access_token_hash_idx ON sessions(access_token_hash);
CREATE INDEX IF NOT EXISTS sessions_refresh_token_hash_idx ON sessions(refresh_token_hash);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline',
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS devices_status_idx ON devices(status);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  budget NUMERIC(12,2) NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);

CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS interactions_type_idx ON interactions(type);
CREATE INDEX IF NOT EXISTS interactions_created_at_idx ON interactions(created_at DESC);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  device_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL,
  topic TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS telemetry_events_device_idx ON telemetry_events(device_id);
CREATE INDEX IF NOT EXISTS telemetry_events_metric_idx ON telemetry_events(metric);
CREATE INDEX IF NOT EXISTS telemetry_events_recorded_at_idx ON telemetry_events(recorded_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM timescaledb_information.hypertables WHERE hypertable_name = 'telemetry_events'
  ) THEN
    PERFORM create_hypertable('telemetry_events', 'recorded_at', if_not_exists => TRUE, migrate_data => TRUE);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM add_retention_policy('telemetry_events', INTERVAL '30 days', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
