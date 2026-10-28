# Frontend Module Map

The React 19 + TypeScript application under `client/src/` is organized around focused feature modules with minimal third-party bloat.

## Entry Point & Routing (`main.tsx`, `App.tsx`)

`main.tsx` mounts `BrowserRouter` and global styles, while `App.tsx` coordinates persona switching, navigation chrome, listings, pickups, notifications, and impact charts.
