# FoodBridge Testing & Verification Guide

Automated verification runs through Vitest (`npm test`), TypeScript (`npm run typecheck`), ESLint (`npm run lint`), and Vite production bundling (`npm run build`).

## Unified Verification Gate

Run `npm run check` before pushing changes to execute all four quality gates sequentially from the repository root.

## Matching Engine Unit Tests (`server/tests/matching.test.js`)

Validates safety holding boundaries, 40-meal scenario ranking, diet exclusions, NGO shift windows, urgency buckets, and Haversine precision.

## Edge-Case Validation Suite (`server/tests/edge-cases.test.js`)

Exercises boundary conditions including overnight NGO shifts, exact deadline cutoffs, partial capacities, and malformed payloads.

## API State-Machine Integration (`server/tests/api.test.js`)

Uses Supertest against an ephemeral MongoDB replica set to verify listing creation, atomic acceptance, collection, delivery, cancellation, and capacity restoration.

## Health & Security Contracts (`server/tests/health.test.js`)

Confirms `/healthz` and `/api/health` readiness payloads, defensive HTTP security headers, and structured JSON 404 responses for unknown API routes.

## AI Memory & Recommendation Suites

`memory-service.test.js`, `ai.test.js`, and `recommendation.test.js` test offline memory retention, cache token savings, copilot answers, and baseline/enriched comparison integrity.
