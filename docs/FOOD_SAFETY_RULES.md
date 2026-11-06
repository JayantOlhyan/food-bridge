# Food Safety Eligibility Rules

FoodBridge enforces deterministic time-temperature screening before any surplus listing becomes claimable. AI recommendations never bypass safety exclusions.

## Disclaimer

Configured holding thresholds are illustrative demo values (`server/config.js` and `client/src/demoEngine.ts`). Production deployments must align with FSSAI or local food safety regulations.

## Holding Conditions Taxonomy

Listings must declare one of four holding regimes: `hot-held`, `refrigerated`, `room-temperature`, or `packaged-sealed`.

## Hot-Held Food Threshold

`hot-held` surplus carries a maximum holding ceiling of **4 hours** from `preparedAt`.

## Refrigerated Food Threshold

`refrigerated` surplus carries a maximum holding ceiling of **8 hours** from `preparedAt`.
