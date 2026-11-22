# FoodBridge System Architecture

FoodBridge coordinates rapid redistribution of surplus event food across Delhi-NCR by combining strict time-temperature safety screening, deterministic NGO matching, and optional operational memory.

## Layered Topology

The monorepo is structured as an npm workspace containing a React 19 + Vite client (`client/`) and an Express 4 + Mongoose API server (`server/`).

## Frontend SPA Layer

The React client renders the public impact simulator at `/` and the interactive organizer/NGO dispatch console at `/app` with Leaflet maps and Recharts analytics.

## Standalone Demo Engine

`client/src/demoEngine.ts` mirrors REST endpoints in-browser backed by versioned `localStorage`, allowing full interactive demos on static hosts such as Netlify with zero backend dependencies.

## Express REST API Layer

`server/app.js` exposes validated REST endpoints using Zod schemas, security response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), and centralized JSON error handling.

## MongoDB Persistence & Transactions

Collections (`Organizer`, `Ngo`, `Listing`, `Pickup`, `Notification`) use Mongoose schemas, with multi-document transactions protecting capacity reservations, cancellations, and expiry sweeps.

## Ephemeral Local Replica Set

When `MONGODB_URI` is unset outside production, `server/db.js` boots a single-node `MongoMemoryReplSet` so transaction semantics work identically in local dev and Vitest suites.

## Hindsight Operational Memory

`server/services/hindsight.js` integrates `@vectorize-io/hindsight-client` with a bounded local fallback store and 5-minute TTL cache to enrich feasible matches without overriding safety gates.

## Health Checks & Graceful Shutdown

`/healthz` and `/api/health` report live Mongoose readiness (`200` vs `503`), while `server/index.js` drains connections and clears background sweep intervals on `SIGINT`/`SIGTERM`.

## Deployment Topologies

FoodBridge supports static SPA hosting (Netlify/Vercel), single-container full-stack serving (`SERVE_STATIC=true` via Docker or Render), and split frontend/API cloud deployments.
