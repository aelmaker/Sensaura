# Sensaura Production-Ready Starter

Monorepo services:

- `backend/` — NestJS API with PostgreSQL persistence
- `web/` — Next.js app (landing, auth, dashboard, devices/campaigns/interactions/analytics)
- `infra/` — Mosquitto + Nginx configs
- `docker-compose.yml` — local orchestration for API, web, TimescaleDB, Redis, Mosquitto, Nginx

## Backend capabilities

### Auth and security

- DB-backed users and sessions
- `accessToken` + `refreshToken`
- Endpoints: register, verify-email, login, refresh, logout, revoke, reset-password request/confirm, me
- Role-based access control from authenticated session only
- Security hardening: Helmet headers, CORS allowlist, global request throttling
- Audit logging for mutating operations

### Domain and ingestion

- Modules: `devices`, `telemetry`, `interactions`, `campaigns`, `analytics`, `ingestion`, `auth`, `health`
- PostgreSQL schema with indexes and TimescaleDB hypertable for telemetry
- Telemetry SSE stream: `GET /api/telemetry/stream`
- MQTT ingestion with QoS subscription, queue processing, retry attempts, idempotent writes
- CRUD + filtering/pagination for devices/campaigns/interactions

### Observability

- `GET /api/health`
- `GET /api/health/readiness`
- `GET /api/health/liveness`
- `GET /api/health/metrics` (Prometheus format)

## Web routes

- `/` — project landing page
- `/auth` — register/login/verify email
- `/dashboard` — telemetry overview
- `/devices` — manage devices
- `/campaigns` — manage campaigns
- `/interactions` — manage interactions
- `/analytics` — analytics summary

## Local run

```bash
docker compose up --build
```

API is exposed at `http://localhost:4000/api` and proxied via Nginx under `http://localhost/api`.

## Auth flow example

1. Register:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","email":"demo@sensaura.local","password":"secret123"}'
```

2. Verify email:
```bash
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<verificationToken>"}'
```

3. Login:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@sensaura.local","password":"secret123"}'
```

4. Access protected endpoint:
```bash
curl http://localhost:4000/api/devices \
  -H "x-access-token: <accessToken>"
```

## CI / security

- `.github/workflows/ci.yml` runs lint/build/compose checks
- `.github/workflows/security.yml` runs CodeQL on JavaScript

## Production notes

- Use managed secret storage for `PGPASSWORD` and all service credentials
- Add real SMTP/email provider for verification and reset delivery
- Terminate HTTPS/TLS with certificates in front of Nginx
- Configure backups and restore drills for TimescaleDB/PostgreSQL
