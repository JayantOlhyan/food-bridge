# Client-Side Standalone Demo Engine

`client/src/demoEngine.ts` enables FoodBridge to operate as a self-contained static web application with realistic state persistence and zero external infrastructure.

## Storage Key & Schema Versioning

State is stored under `STORAGE_KEY` in `window.localStorage` with an explicit `STORE_VERSION` tag so outdated browser snapshots reseed cleanly after upgrades.
