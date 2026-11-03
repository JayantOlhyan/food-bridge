# Hindsight Operational Memory Service

`server/services/hindsight.js` augments deterministic rescue logistics with historical NGO delivery outcomes while preserving strict food-safety invariants.

## Optional Cloud Configuration

Supplying `HINDSIGHT_API_KEY`, `HINDSIGHT_API_URL`, and `HINDSIGHT_BANK_ID` connects to Hindsight Cloud via `@vectorize-io/hindsight-client`.

## Zero-Config Local Fallback

When `HINDSIGHT_API_KEY` is omitted, operational events are captured in a bounded in-process `localMemoryStore` (`MAX_LOCAL_MEMORIES = 500`) so tests and local demos stay functional offline.
