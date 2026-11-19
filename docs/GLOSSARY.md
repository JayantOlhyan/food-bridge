# FoodBridge Domain Glossary

Shared terminology used across engineering code, API contracts, UI copy, and operational runbooks.

## Actors

- **Organizer**: Event caterer, hotel banquet, corporate cafeteria, or community host listing surplus meals.
- **NGO Partner**: Verified charitable kitchen or shelter receiving and distributing rescued food.

## Safety Terms

- **Holding Condition**: Storage category (`hot-held`, `refrigerated`, `room-temperature`, `packaged-sealed`) governing maximum safe hold duration.
- **Safe Deadline**: Earlier of the organizer's pickup closing time and `preparedAt + maxHoldHours`.

## Matching Tiers

- **Full Match**: Feasible NGO whose remaining meal capacity meets or exceeds the entire listing quantity.
- **Partial Match**: Feasible NGO with positive remaining capacity smaller than the listing quantity.
- **Excluded**: NGO disqualified by safety failure, shift hours, diet mismatch, distance/ETA, or zero capacity.

## Pickup Lifecycle States

- `POSTED` -> `ACCEPTED` -> `COLLECTED` -> `DELIVERED`, with terminal exception states `EXPIRED`, `CANCELLED`, and `INELIGIBLE`.
