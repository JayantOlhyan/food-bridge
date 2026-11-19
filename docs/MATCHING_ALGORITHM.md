# Deterministic NGO Matching Algorithm

FoodBridge ranks verified redistribution partners using explainable constraints and weighted scoring so the nearest NGO does not automatically win when capacity or timing is superior.

## Haversine Great-Circle Distance

Distances between event venues and NGO kitchens are calculated with the spherical Haversine formula using mean Earth radius `6371 km`.

## Travel ETA Estimation

Estimated arrival time uses an urban average speed of `20 km/h` plus an `8 minute` loading/handoff buffer: `etaMinutes = ceil(distanceKm / 20 * 60 + 8)`.

## Effective Arrival Timestamp

Pickup arrival cannot precede the organizer's opening window: `arrival = max(now + etaMinutes, pickupWindowStart)`.

## Asia/Kolkata Shift Availability

`availableAt()` converts UTC timestamps to IST (`UTC+05:30`) and supports both daytime (`08:00-22:00`) and overnight (`20:00-04:00`) NGO shifts.

## Hard Exclusion Gates

Candidates are marked `Excluded` when the listing fails safety checks, the NGO is inactive, arrival falls outside shift hours, diet tags conflict (`veg`/`non-veg`), arrival exceeds `safeDeadline`, or remaining capacity is zero.

## Full vs Partial Match Tiers

Feasible NGOs with `remainingCapacityMeals >= quantityMeals` earn `Full match` (tier 0); NGOs with positive but smaller capacity are flagged `Partial` (tier 1) since split pickups are out of scope.

## Composite Scoring Weights

Full matches are scored from `0–100` using weighted signals: **40% time margin**, **35% proximity**, and **25% capacity fit** (`quantityMeals / remainingCapacityMeals`).
