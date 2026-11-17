# Client-Side Standalone Demo Engine

`client/src/demoEngine.ts` enables FoodBridge to operate as a self-contained static web application with realistic state persistence and zero external infrastructure.

## Storage Key & Schema Versioning

State is stored under `STORAGE_KEY` in `window.localStorage` with an explicit `STORE_VERSION` tag so outdated browser snapshots reseed cleanly after upgrades.

## Headless & Private-Mode Fallback

When `localStorage` throws or is unavailable (such as in Node Vitest workers or restricted iframes), state seamlessly falls back to an in-memory `memoryStore`.

## Seeded Delhi-NCR Ecosystem

`createSeedStore()` initializes sample caterers, seven NGOs across Delhi-NCR with distinct shift hours and dietary capabilities, active surplus listings, and historical deliveries.

## Simulated API Dispatch

`handleDemoApi(path, body)` parses REST-equivalent paths (`/bootstrap`, `/listings`, `/matches`, `/accept`, `/collect`, `/deliver`, `/cancel`, `/impact`, `/ai/*`, `/demo/reset`).

## Parity with Server Rules

The demo engine mirrors `server/services/matching.js` holding hours, minimum 30-minute lead time, Haversine math, IST window checks, and 40/35/25 scoring weights.

## Automatic Deadline Sweeps

Before read and mutation handlers run, `sweepExpired()` transitions past-deadline items to `EXPIRED` and credits back any locked NGO meal capacity.

## Synthetic ObjectId Generation

`makeId()` and `nextStoreId()` produce valid 24-character hex identifiers matching MongoDB ObjectId conventions so UI components remain backend-agnostic.
