# FoodBridge Testing & Verification Guide

Automated verification runs through Vitest (`npm test`), TypeScript (`npm run typecheck`), ESLint (`npm run lint`), and Vite production bundling (`npm run build`).

## Unified Verification Gate

Run `npm run check` before pushing changes to execute all four quality gates sequentially from the repository root.
