# FoodBridge — Surplus Food Rescue Network

> **"Good Food. No Waste. Greater Impact."**  
> *Developed for the Hackathon by Team Techie Titans*

FoodBridge connects surplus edible food from large gatherings (weddings, banquet halls, temple bhandaras, gurdwara langars, concerts) with nearby NGOs before the safe collection window closes.

**Core Innovation & USP**:  
> *"FoodBridge doesn't simply find the nearest NGO. It prioritizes feasible, safety-eligible rescues before the collection window closes."*

---

## Table of Contents
1. [Key Capabilities & Innovation](#key-capabilities--innovation)
2. [Architecture](#architecture)
3. [Implemented (MVP) vs Planned / Simulated](#implemented-mvp-vs-planned--simulated)
4. [Matching Engine & Safety Filter Specification](#matching-engine--safety-filter-specification)
5. [Tech Stack](#tech-stack)
6. [Quick Start & Setup](#quick-start--setup)
7. [Running Tests & Quality Checks](#running-tests--quality-checks)
8. [3-Minute Hackathon Demo Script](#3-minute-hackathon-demo-script)
9. [Deployment Guide](#deployment-guide)
10. [Team Techie Titans](#team-techie-titans)

---

## Key Capabilities & Innovation

Traditional food recovery relies on phone calls, informal messaging groups, or naive distance-based dispatch. This fails in large cities because:
1. **Holding limits expire**: Hot food left unmanaged becomes unsafe within hours.
2. **Nearest NGO might lack capacity**: Sending 40 meals to a shelter with only 10 beds wastes a rescue.
3. **Traffic makes nearby NGOs arrive too late**: Distance alone ignores travel delay and preparation windows.

FoodBridge solves this with a **deterministic, safety-first matching engine**:
- **Safety Filter**: Evaluates holding condition (hot-held, refrigerated, room temperature, sealed) against maximum holding hours. Rejects expired or insufficient-lead listings before NGOs are ever notified.
- **Feasibility Hard Filters**: Evaluates road travel ETA (`haversineKm / avgSpeed + buffer`), NGO operating hours, and dietary compatibility (veg vs non-veg).
- **Capacity Fit**: Full matches (`capacity >= quantity`) are strictly ranked above partial matches.
- **Multi-Factor Scoring**: Ranks feasible full matches using time margin (slack before safe deadline), travel distance, and capacity fit.
- **Atomic State Machine**: Prevents double accepts (`POSTED → ACCEPTED → COLLECTED → DELIVERED`), automatically sweeps expired food, and restores NGO capacity on cancellation or expiry.

---

## Architecture

```
+---------------------------------------------------------------------------------+
|                                CLIENT (React 19)                                |
|  - Vite + TypeScript + Tailwind CSS + React Router + Lucide Icons + Recharts    |
|  - Interactive Delhi OpenStreetMap via Leaflet                                  |
|  - Role Switcher (Organizer & 7 Seeded NGOs), In-App Simulated Alerts Bell      |
+---------------------------------------------------------------------------------+
                                      |
                                  HTTP REST
                                      |
+---------------------------------------------------------------------------------+
|                             BACKEND (Express API)                               |
|  - Zod Request Validation                                                       |
|  - Atomic State Machine & MongoDB Transactions (findOneAndUpdate)               |
|  - Real-time Expiry Sweeper (on-read + 60s background interval)                  |
|  - Simulated In-App Notification System                                         |
+---------------------------------------------------------------------------------+
          |                                                   |
          v                                                   v
+-------------------------------+           +-------------------------------------+
|    MATCHING ENGINE MODULE     |           |          DATABASE (MongoDB)         |
|  - Pure JS/TS (no DB or HTTP) |           |  - Mongoose ODM                     |
|  - 100% Deterministic         |           |  - In-Memory Replica Set (Dev/Test) |
|  - Full Unit Test Coverage    |           |  - MongoDB Atlas (Production)       |
+-------------------------------+           +-------------------------------------+
```

---

## Implemented (MVP) vs Planned / Simulated

| Component | MVP Status | Implementation Details |
|---|---|---|
| **Safety Eligibility Filter** | **Implemented (MVP)** | Deterministic check: hold hours by condition, min lead time, future prep check, safe deadline computation. |
| **Feasibility Matching Module** | **Implemented (MVP)** | Pure TypeScript/JavaScript module. Evaluates travel ETA, NGO hours, diet type, capacity fit, and multi-factor ranking. |
| **Organizer Web App** | **Implemented (MVP)** | New listing creation with map pin drop, live eligibility report, ranked NGO cards with reasons, pickup tracking. |
| **NGO Web App** | **Implemented (MVP)** | Feed of feasible food sorted by urgency (High/Medium/Low), remaining capacity banner, 1-click accept/decline. |
| **Pickup Tracking & Handover** | **Implemented (MVP)** | Tracker (`POSTED → ACCEPTED → COLLECTED → DELIVERED`), volunteer confirmation, verified delivered meals & kg input. |
| **Impact Dashboard** | **Implemented (MVP)** | Confirmed delivered meals, kg rescued, deliveries, estimated CO2e avoided (`kg * 2.5`), Recharts timeline. |
| **Interactive Map** | **Implemented (MVP)** | Leaflet + OpenStreetMap tiles with mock Delhi coordinates, venue pins, NGO color-coded markers, travel polylines. |
| **Database & Concurrency** | **Implemented (MVP)** | Ephemeral MongoDB replica set (`mongodb-memory-server`) or Atlas; atomic `findOneAndUpdate` prevents double accepts. |
| **Automated Testing** | **Implemented (MVP)** | 19 Vitest unit and integration tests covering the 40-meal scenario, safety filters, atomic accept, and state transitions. |
| **Authentication** | **Simulated (MVP)** | Demo login role switcher in topbar (`Organizer: Sample Wedding Caterer`, `NGO A` to `NGO G`). *Firebase Auth is planned.* |
| **Notifications** | **Simulated (MVP)** | In-app simulated alerts with notification bell and 5s polling. *Firebase Cloud Messaging (FCM) is planned.* |
| **SMS / Push / Payment** | **Planned** | Out of scope for hackathon MVP; marked as planned in UI and documentation. |

---

## Matching Engine & Safety Filter Specification

### 1. Safety Filter (`eligibility.js`)
Configured thresholds (labeled clearly in UI and code as demo values, not medical/FSSAI guidance):
- `maxHoldHours`: `hot-held`: 4h, `refrigerated`: 8h, `room-temperature`: 2h, `packaged-sealed`: 6h.
- `minLeadMinutes`: 30 minutes.
- `safeDeadline` = `min(pickupWindowEnd, preparedAt + maxHoldHours[condition])`.

**Ineligible if**:
- `safeDeadline <= now`
- `(safeDeadline - now) < minLeadMinutes`
- `quantityMeals <= 0`
- `preparedAt > now` (future preparation time)
- `pickupWindowStart >= pickupWindowEnd`
- Missing required fields.

*Ineligible listings are saved with human-readable reasons and are NEVER exposed to NGOs.*

### 2. Feasibility Hard Filters
For every active NGO:
1. **Activity**: Dropped if `!ngo.active`.
2. **Operating Hours**: Dropped if estimated arrival time falls outside `availableFrom` – `availableTo`.
3. **Diet Compatibility**: Dropped if listing has `non-veg` and `!ngo.acceptsNonVeg`.
4. **ETA Feasibility**: `travelMinutes = (haversineKm / avgSpeedKmh) * 60 + bufferMinutes`. Dropped if `now + travelMinutes > safeDeadline`.
5. **Capacity**: Dropped if `remainingCapacityMeals <= 0`.

### 3. Capacity Tiering
- `remainingCapacityMeals >= quantityMeals` → **Full match** (Tier 0).
- `remainingCapacityMeals < quantityMeals` → **Partial match** (Tier 1). Split pickups are marked out-of-scope.

### 4. Scoring Formula (Feasible Full Matches Only, 0–100)
Configurable weights (`weights: { timeMargin: 0.4, distance: 0.35, capacityFit: 0.25 }`):
$$\text{Score} = 100 \times \left( 0.4 \times \frac{\text{margin}}{\text{maxMargin}} + 0.35 \times \left(1 - \frac{\text{distance}}{\text{maxDistance}}\right) + 0.25 \times \frac{\text{quantity}}{\text{remainingCapacity}} \right)$$
- **Time Margin**: More slack before safe deadline is preferred.
- **Distance**: Closer NGOs receive higher score.
- **Capacity Fit**: A tighter fit is preferred so high-capacity shelters stay open for massive catering leftovers.

### 5. Deterministic Tie-Breaking
`Tier (Full > Partial > Excluded) → Score (Desc) → Distance (Asc) → NGO ID (Asc)`

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, React Router 7, Lucide Icons, Leaflet & React-Leaflet, Recharts
- **Backend**: Node.js, Express 4, Mongoose 8, Zod 3
- **Database**: MongoDB (Built-in ephemeral replica set via `mongodb-memory-server` in dev/test, or MongoDB Atlas via `MONGODB_URI`)
- **Testing**: Vitest 3, Supertest 7
- **Linting & Types**: ESLint 9, TypeScript 5.7

---

## Quick Start & Setup

### Prerequisites
- Node.js 18+ (tested on Node v20 / v22 / v25)
- npm 9+

### 1. Clone & Install
```bash
git clone <repo-url> FoodBridge
cd FoodBridge
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
MONGODB_URI=
PORT=4000
DEMO_MODE=true
CLIENT_ORIGIN=http://localhost:5173
```
*(Leave `MONGODB_URI` empty to use the zero-configuration embedded MongoDB replica set).*

### 3. Start Development Server
```bash
npm run dev
```
- Client runs at: **http://localhost:5173**
- Express API runs at: **http://localhost:4000**

### 4. Seed Demo Data
In a new terminal window:
```bash
npm run seed
```
*(Populates 7 generic Delhi NGOs, 1 Organizer, the pitch deck 40-meal scenario, an expired listing, an active pickup, and two completed deliveries).*

---

## Running Tests & Quality Checks

Run the automated test suite:
```bash
# Run Vitest unit & integration tests
npm test

# Run TypeScript typecheck across client
npm run typecheck

# Run ESLint across entire codebase
npm run lint

# Build client production bundle
npm run build
```

---

## 3-Minute Hackathon Demo Script

Follow this script during your pitch presentation:

### Minute 1: The Problem & The Core Innovation (Landing & Organizer)
1. Open **http://localhost:5173/**. Point out the tagline: *"Good Food. No Waste. Greater Impact."* and the live preview component.
2. Scroll to **The Core Innovation**:
   - Show the worked scenario: 40 meals.
   - Explain why **NGO A (2 km away, 50-meal capacity)** wins with a **Full match (Score 91)** over **NGO B (1 km away, 10-meal capacity)**, which is insufficient.
   - Emphasize: *"The nearest NGO does not automatically win."*
3. Click **"Try the live demo"** to jump to `/app`.

### Minute 2: Organizer Posts & Inspects Matches
1. You are logged in as **Organizer: Sample Wedding Caterer**.
2. Click **New Listing**:
   - Title: `Sample Wedding Reception`
   - Food: `Veg pulao, dal makhani, paneer butter masala, roti`
   - Quantity: `40 meals`, `18 kg`
   - Holding: `Hot-held` (4h safe limit)
   - Pickup window: `Next 2 hours`
   - Note the food-safety disclaimer: *"A donor-entered deadline does not prove food safety."*
3. Click **"Check eligibility & post"**:
   - The green eligibility banner appears: *"Eligible for rescue — Safe collection deadline within holding limit"*.
   - View the Ranked NGO cards:
     - **NGO A** is ranked #1 with **Score 91** (`Capacity 50 >= 40 needed`, `Arrives before deadline`).
     - **NGO B** is tagged **Partial** (`Can accept 10 of 40 meals`).
     - **NGO C** is **Excluded** (`Outside availability hours`).
   - The interactive Leaflet map shows the event venue and all NGOs with a route dashed line.

### Minute 3: NGO Acceptance, Delivery & Verified Impact
1. Switch the topbar role dropdown from **Organizer** to **NGO: NGO A – Community Kitchen**.
2. Notice the **Available Food** feed:
   - Listings are sorted by urgency (`High`, `Medium`, `Low`).
   - Sangeet Night is red (`High urgency`), Sample Wedding Reception is amber (`Medium urgency`).
   - NGO A's remaining capacity (`50 meals`) is prominently displayed.
3. Click **"Accept pickup"** on `Sample Wedding Reception`.
   - The pickup is claimed atomically via MongoDB transaction.
   - Switch role to **NGO B** or check from another tab: the listing is instantly gone and cannot be double-accepted.
4. On NGO A's **My Pickups** screen:
   - Click **"Mark collected"** (volunteer has picked up the food from the banquet).
   - Click **"Confirm delivery"**: The modal prompts for verified counts.
   - Enter `40` confirmed meals, `18` kg, check *"Food handed over in good condition"*, and submit.
5. Click **Impact** on the sidebar:
   - Verified meals redistributed updates in real time.
   - Food rescued (kg) and estimated CO2e avoided (`kg * 2.5`) update.
   - The Recharts visual timeline plots confirmed rescues over time.

---

## Deployment Guide

### Client (Vercel / Netlify)
1. Root directory: `client`
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set environment variable: `VITE_API_URL=https://your-server-api.onrender.com`

### Server (Render / Railway / Fly.io)
1. Build command: `npm install`
2. Start command: `node server/index.js`
3. Environment variables:
   - `MONGODB_URI`: Connection string to MongoDB Atlas cluster
   - `PORT`: 4000 (or provided by host)
   - `CLIENT_ORIGIN`: `https://your-frontend.vercel.app`
   - `DEMO_MODE`: `true` (enables `/api/demo/reset`)

---

## Team Techie Titans

| Avatar | Member | Role |
|---|---|---|
| **JT** | `[Member Name]` | Project Lead |
| **AS** | `[Member Name]` | Backend Developer |
| **RK** | `[Member Name]` | Frontend Developer |
| **MP** | `[Member Name]` | Research & Operations |

*FoodBridge — Built with care for a hunger-free, zero-waste future.*
