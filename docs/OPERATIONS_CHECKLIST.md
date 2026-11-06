# FoodBridge Operations & Release Checklist

Use this checklist when preparing local builds, static demo deployments, or full-stack container releases.

## Local Development Prerequisites

- Node.js `>=18.0.0` (Node 20 LTS recommended).
- Install workspace dependencies once via `npm ci` at the repository root.

## Environment Variable Verification

- Confirm `MONGODB_URI` is configured in production (`NODE_ENV=production`).
- Set `CLIENT_ORIGIN` to allowed comma-separated frontend origins.
- Optionally configure `HINDSIGHT_API_KEY` and `HINDSIGHT_BANK_ID` for remote AI memory.
