# Sensaura MVP Stack

Monorepo with:

- `backend/` — NestJS API
- `web/` — Next.js app (landing + auth + dashboard)
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

RBAC is enforced via `x-role` (`admin`, `analyst`, `operator`, `viewer`).
When authenticated with `x-auth-token`, role is resolved from the authenticated user.

## Web pages

- `/` — загальна сторінка проекту
- `/auth` — реєстрація/авторизація
- `/dashboard` — панель телеметрії (потребує логін)

## Auth API

- `POST /api/auth/register` → create user and return `{ token, user }`
- `POST /api/auth/login` → login and return `{ token, user }`
- `GET /api/auth/me` with `x-auth-token` → current user

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

curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo User","email":"demo@sensaura.local","password":"secret123"}'

curl -H "x-role: admin" http://localhost:4000/api/telemetry
curl -H "x-role: admin" -X POST http://localhost:4000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"kiosk-1","metric":"temperature","value":23.4}'
```
