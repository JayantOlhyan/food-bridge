# FoodBridge REST API Reference

All API endpoints accept and return `application/json`. Requests are bounded to `100kb` and validated with Zod before touching persistence.

## Health & Readiness

- `GET /healthz` and `GET /api/health` return `{ status, database, uptimeSeconds, demoMode, timestamp }`.
- Returns `200 OK` when Mongoose `readyState === 1` and `503 Service Unavailable` otherwise.

## Bootstrap Payload

- `GET /api/bootstrap` returns seeded organizers, active NGOs, active matching configuration, `demoMode`, and `ephemeral` storage indicators.
