# Deterministic NGO Matching Algorithm

FoodBridge ranks verified redistribution partners using explainable constraints and weighted scoring so the nearest NGO does not automatically win when capacity or timing is superior.

## Haversine Great-Circle Distance

Distances between event venues and NGO kitchens are calculated with the spherical Haversine formula using mean Earth radius `6371 km`.

## Travel ETA Estimation

Estimated arrival time uses an urban average speed of `20 km/h` plus an `8 minute` loading/handoff buffer: `etaMinutes = ceil(distanceKm / 20 * 60 + 8)`.

## Effective Arrival Timestamp

Pickup arrival cannot precede the organizer's opening window: `arrival = max(now + etaMinutes, pickupWindowStart)`.
