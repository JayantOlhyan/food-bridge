# FoodBridge System Architecture

FoodBridge coordinates rapid redistribution of surplus event food across Delhi-NCR by combining strict time-temperature safety screening, deterministic NGO matching, and optional operational memory.

## Layered Topology

The monorepo is structured as an npm workspace containing a React 19 + Vite client (`client/`) and an Express 4 + Mongoose API server (`server/`).
