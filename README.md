# Sensaura MVP Stack

Monorepo with:

- `backend/` — NestJS API
- `web/` — Next.js dashboard
- `infra/` — Mosquitto + Nginx configs
- `docker-compose.yml` — local stack orchestration

## Backend API modules

- `devices`
- `telemetry` (includes SSE stream)
- `interactions`
- `campaigns`
- `analytics`
- `ingestion` (MQTT subscriber)
- `auth`
- `health`

RBAC is enforced via `x-role` header (`admin`, `analyst`, `operator`, `viewer`).

## Run with Docker Compose

```bash
docker compose up --build
```

Services:

- `api` (`http://localhost:4000`, proxied under `http://localhost/api`)
- `web` (`http://localhost:3000`, proxied under `http://localhost/`)
- `timescaledb`
- `redis`
- `mosquitto`
- `nginx`

## Local development

Backend:

```bash
cd /home/runner/work/Sensaura/Sensaura/backend
npm install
npm run start:dev
```

Web:

```bash
cd /home/runner/work/Sensaura/Sensaura/web
npm install
npm run dev
```

## Quick API checks

```bash
curl http://localhost:4000/api/health
curl -H "x-role: admin" http://localhost:4000/api/telemetry
curl -H "x-role: admin" -X POST http://localhost:4000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"kiosk-1","metric":"temperature","value":23.4}'
```
