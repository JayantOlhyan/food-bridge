# FoodBridge Operations & Release Checklist

Use this checklist when preparing local builds, static demo deployments, or full-stack container releases.

## Local Development Prerequisites

- Node.js `>=18.0.0` (Node 20 LTS recommended).
- Install workspace dependencies once via `npm ci` at the repository root.

## Environment Variable Verification

- Confirm `MONGODB_URI` is configured in production (`NODE_ENV=production`).
- Set `CLIENT_ORIGIN` to allowed comma-separated frontend origins.
- Optionally configure `HINDSIGHT_API_KEY` and `HINDSIGHT_BANK_ID` for remote AI memory.

## Container Stack Verification

- Build and boot via `docker compose up -d --build`.
- Confirm healthy readiness via `curl -fsS http://localhost:4000/healthz`.

## Static Demo Release (Netlify / Vercel)

- Ensure `client/dist` builds cleanly with chunked vendor bundles (`react-vendor`, `charts-vendor`, `map-vendor`, `icons-vendor`).
- Confirm SPA fallback rewrite routes `/app` to `/index.html`.

## CI/CD Pipeline Gates

- Verify `.github/workflows/ci.yml` passes `typecheck`, `lint`, `test`, and `build`.
- Never bypass failing safety or transaction tests prior to tagging a release.
