# Frontend Module Map

The React 19 + TypeScript application under `client/src/` is organized around focused feature modules with minimal third-party bloat.

## Entry Point & Routing (`main.tsx`, `App.tsx`)

`main.tsx` mounts `BrowserRouter` and global styles, while `App.tsx` coordinates persona switching, navigation chrome, listings, pickups, notifications, and impact charts.

## Client Adapter & Formatters (`api.ts`)

`api.ts` centralizes request dispatch to `handleDemoApi`, IST time formatting, live deadline countdown labels, relative timestamps, and event thumbnail selection.

## Shared UI Primitives (`components.tsx`)

Provides reusable `Brand`, semantic `Badge`, operational `Stats`, verified `ImpactStats`, and tabular `ListingsTable` components.

## Interactive Landing Experience (`Landing.tsx`)

Presents the 40-meal worked matching scenario, an interactive surplus impact simulator, workflow steps, and direct entry to the live demo.

## Surplus Listing Form (`NewListing.tsx`)

Captures venue metadata, food items with `veg`/`non-veg` tags, holding conditions, preparation time, and pickup window bounds with inline validation.

## Interactive Dispatch Map (`MapView.tsx`)

Renders Leaflet markers for event venues and candidate NGOs, route polylines, marker legends, and interactive coordinate picking.

## Delivery Confirmation Modal (`App.tsx`)

`DeliveryModal` collects verified delivered meals, rescued weight in kilograms, and a mandatory food-condition attestation before closing a rescue.

## AI Dispatch Copilot (`AiCopilot.tsx`)

Provides a tabbed modal with suggested dispatch prompts, recalled operational citations, cache-hit badges, and an interactive memory search explorer.
