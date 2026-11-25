# FoodBridge Deployment Plan & Production Runbook

- **Live Production Demo (Netlify):** https://food-bridge-01.netlify.app/
- **Repository:** https://github.com/JayantOlhyan/food-bridge

This document defines the end-to-end deployment architecture, environment configuration, CI/CD automation, health checks, security hardening, and rollback procedures for **FoodBridge**.

---

## 1. Deployment Topologies

FoodBridge supports three production deployment topologies depending on operational needs:

| Topology | Best For | Config Files | Backend / DB Required? |
|---|---|---|---|
| **A. Containerized Full-Stack (Docker)** | Self-hosted VPS, Cloud Run, ECS, Fly.io, staging | `Dockerfile`, `docker-compose.yml` | Yes (MongoDB replica set) |
| **B. Managed PaaS Full-Stack (Render)** | Managed Node.js API + built SPA + MongoDB Atlas | `render.yaml` | Yes (MongoDB Atlas M0+) |
| **C. Static Edge Demo (Netlify / Vercel)** | Zero-ops public demos, hackathons, CDN edge delivery | `netlify.toml`, `vercel.json` | No (100% browser `demoEngine`) |

---

## 2. Environment Variables & Secrets Matrix

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Production | `development` | Set to `production` to enforce `MONGODB_URI`, HSTS, and static SPA serving. |
| `PORT` | No | `4000` | HTTP port bound by the Express API server. |
| `SERVE_STATIC` | No | `false` (`true` in Docker/Render) | Serves `client/dist` directly from Express with SPA fallback. |
| `MONGODB_URI` | Production | *(ephemeral replica set in dev)* | MongoDB Atlas or replica-set URI (required for atomic multi-document transactions). |
| `CLIENT_ORIGIN` | Production | `http://localhost:5173` | Comma-separated CORS allowlist for frontend origins. |
| `DEMO_MODE` | No | `true` | Enables `/api/demo/reset` and auto-seeding when DB is empty. Set `false` for live NGO operations. |
| `HINDSIGHT_API_URL` | No | `https://api.hindsight.vectorize.io` | Hindsight AI memory endpoint. |
| `HINDSIGHT_API_KEY` | No | *(empty → local memory bank)* | API key for Hindsight Cloud. When omitted, FoodBridge falls back gracefully to its local memory bank. |
| `HINDSIGHT_BANK_ID` | No | `foodbridge` | Target Hindsight memory bank identifier. |

> **Important:** MongoDB atomic transactions (`mongoose.connection.transaction`) require a **replica set**. MongoDB Atlas clusters provide replica sets out of the box; local Docker uses `mongod --replSet rs0` in `docker-compose.yml`.

---

## 3. Step-by-Step Deployment Procedures

### Option A: Docker & Docker Compose (Full-Stack)

1. Copy and customize environment variables:
   ```bash
   cp .env.example .env
   ```
2. Build and start the multi-stage production container + MongoDB replica set:
   ```bash
   docker compose up -d --build
   ```
3. Verify readiness:
   ```bash
   curl -fsS http://localhost:4000/healthz
   ```
4. Tear down cleanly:
   ```bash
   docker compose down
   ```

### Option B: Render Blueprint (`render.yaml`) + MongoDB Atlas

1. Provision a free **MongoDB Atlas** cluster (M0+), create a database user, and allow Render outbound IPs.
2. In Render Dashboard, click **New → Blueprint** and connect this GitHub repository.
3. Render automatically reads `render.yaml`, builds the client + server (`npm ci && npm run build`), and configures `/healthz` health checks.
4. Set secret environment variables in Render:
   - `MONGODB_URI`: your MongoDB Atlas SRV connection string
   - `CLIENT_ORIGIN`: `https://<your-service>.onrender.com`
   - `HINDSIGHT_API_KEY`: optional Hindsight API key

### Option C: Netlify or Vercel (Static Edge Demo)

- **Netlify**: Connect repository; `netlify.toml` automatically sets `base = "client"`, `command = "npm run build"`, `publish = "dist"`, SPA redirects, security headers, and immutable asset caching.
- **Vercel**: Connect repository; `vercel.json` automatically configures Vite build, `client/dist` output, SPA rewrites, and cache headers.

---

## 4. Automated CI/CD Pipeline

FoodBridge uses two GitHub Actions workflows:

1. **Continuous Integration (`.github/workflows/ci.yml`)**
   - Triggers on every push to `main` and every Pull Request.
   - Runs `npm ci`, TypeScript typecheck (`npm run typecheck`), ESLint (`npm run lint`), full Vitest suite (`npm test` — 52 tests across server and client), and Vite production build (`npm run build`).
   - Uploads `client/dist` as a build artifact.

2. **Continuous Deployment (`.github/workflows/deploy.yml`)**
   - Triggers on push to `main` or manual `workflow_dispatch`.
   - Enforces a **Pre-deploy Verification Gate** (`npm run check`) before any deployment runs.
   - Deploys static demo to Netlify when `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` repository secrets are configured.
   - Triggers Render production redeploy when `RENDER_DEPLOY_HOOK_URL` repository secret is configured.

---

## 5. Health Checks, Observability & Graceful Shutdown

- **Liveness & Readiness**: `GET /healthz` and `GET /api/health` return HTTP `200` with `{ status: "ok", database: "connected", uptimeSeconds, demoMode, timestamp }` when MongoDB is connected, or HTTP `503` (`status: "degraded"`) if database connectivity is lost.
- **Graceful Shutdown**: `server/index.js` handles `SIGTERM` and `SIGINT` by clearing the 60s expiry sweeper interval, draining in-flight HTTP requests via `server.close()`, and cleanly disconnecting Mongoose before exiting.
- **Security Headers**: Express disables `X-Powered-By` and sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(self)`, and `Strict-Transport-Security` in production.

---

## 6. Rollback & Incident Recovery Plan

1. **Application Rollback**:
   - **Netlify / Vercel**: Promote the previous verified deploy snapshot from the platform dashboard (instant atomic CDN switch).
   - **Render / Docker**: Revert the offending commit (`git revert <sha> && git push origin main`) or redeploy the previous container image tag.
2. **Database Recovery**:
   - MongoDB Atlas automated point-in-time snapshots allow restoration to any prior consistent state.
   - Because rescue acceptance and capacity reservation execute inside atomic MongoDB transactions, partial writes cannot corrupt NGO meal capacity.
3. **AI Service Degradation**:
   - If Hindsight Cloud is unreachable or rate-limited, `server/services/hindsight.js` automatically falls back to deterministic matching and local memory bank responses without impacting rescue dispatch latency or safety rules.
