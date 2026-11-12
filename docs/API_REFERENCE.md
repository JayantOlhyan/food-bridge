# FoodBridge REST API Reference

All API endpoints accept and return `application/json`. Requests are bounded to `100kb` and validated with Zod before touching persistence.

## Health & Readiness

- `GET /healthz` and `GET /api/health` return `{ status, database, uptimeSeconds, demoMode, timestamp }`.
- Returns `200 OK` when Mongoose `readyState === 1` and `503 Service Unavailable` otherwise.

## Bootstrap Payload

- `GET /api/bootstrap` returns seeded organizers, active NGOs, active matching configuration, `demoMode`, and `ephemeral` storage indicators.

## Listing Creation & Queries

- `GET /api/listings` lists surplus entries newest-first, optionally filtered by `organizerId`.
- `POST /api/listings` validates `listingInput`, runs safety `eligibility()`, and persists status `POSTED` or `INELIGIBLE`.

## Candidate NGO Matching

- `GET /api/listings/:id/matches` computes deterministic feasibility, travel ETA, match tier (`Full match`, `Partial`, `Excluded`), and composite scores.

## Memory-Enriched Recommendations

- `GET /api/listings/:id/recommendations` augments deterministic candidates with Hindsight reliability context, score deltas, and baseline comparisons.

## Pickup Claim Lifecycle

- `POST /api/listings/:id/accept` atomically claims a listing for an eligible NGO, creates a `Pickup`, and decrements `remainingCapacityMeals`.
- `POST /api/listings/:id/cancel` cancels the listing and restores reserved NGO capacity.
