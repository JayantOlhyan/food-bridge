# FoodBridge Domain Glossary

Shared terminology used across engineering code, API contracts, UI copy, and operational runbooks.

## Actors

- **Organizer**: Event caterer, hotel banquet, corporate cafeteria, or community host listing surplus meals.
- **NGO Partner**: Verified charitable kitchen or shelter receiving and distributing rescued food.

## Safety Terms

- **Holding Condition**: Storage category (`hot-held`, `refrigerated`, `room-temperature`, `packaged-sealed`) governing maximum safe hold duration.
- **Safe Deadline**: Earlier of the organizer's pickup closing time and `preparedAt + maxHoldHours`.
