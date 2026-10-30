# FoodBridge System Architecture

FoodBridge coordinates rapid redistribution of surplus event food across Delhi-NCR by combining strict time-temperature safety screening, deterministic NGO matching, and optional operational memory.

## Layered Topology

The monorepo is structured as an npm workspace containing a React 19 + Vite client (`client/`) and an Express 4 + Mongoose API server (`server/`).

## Frontend SPA Layer

The React client renders the public impact simulator at `/` and the interactive organizer/NGO dispatch console at `/app` with Leaflet maps and Recharts analytics.
