# FoodBridge Testing & Verification Guide

Automated verification runs through Vitest (`npm test`), TypeScript (`npm run typecheck`), ESLint (`npm run lint`), and Vite production bundling (`npm run build`).

## Unified Verification Gate

Run `npm run check` before pushing changes to execute all four quality gates sequentially from the repository root.

## Matching Engine Unit Tests (`server/tests/matching.test.js`)

Validates safety holding boundaries, 40-meal scenario ranking, diet exclusions, NGO shift windows, urgency buckets, and Haversine precision.

## Edge-Case Validation Suite (`server/tests/edge-cases.test.js`)

Exercises boundary conditions including overnight NGO shifts, exact deadline cutoffs, partial capacities, and malformed payloads.
