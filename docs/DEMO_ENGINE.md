# Client-Side Standalone Demo Engine

`client/src/demoEngine.ts` enables FoodBridge to operate as a self-contained static web application with realistic state persistence and zero external infrastructure.

## Storage Key & Schema Versioning

State is stored under `STORAGE_KEY` in `window.localStorage` with an explicit `STORE_VERSION` tag so outdated browser snapshots reseed cleanly after upgrades.

## Headless & Private-Mode Fallback

When `localStorage` throws or is unavailable (such as in Node Vitest workers or restricted iframes), state seamlessly falls back to an in-memory `memoryStore`.

## Seeded Delhi-NCR Ecosystem

`createSeedStore()` initializes sample caterers, seven NGOs across Delhi-NCR with distinct shift hours and dietary capabilities, active surplus listings, and historical deliveries.
