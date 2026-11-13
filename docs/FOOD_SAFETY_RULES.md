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

## Ambient & Sealed Thresholds

`room-temperature` dishes expire **2 hours** after preparation, while `packaged-sealed` items allow up to **6 hours**.

## Safe Deadline Calculation

`safeDeadline = min(pickupWindowEnd, preparedAt + maxHoldHours[holdingCondition])`, ensuring collection never extends beyond either venue closing time or food safety limits.

## Lead-Time Guardrail

Listings require at least **30 minutes** (`minLeadMinutes`) remaining before `safeDeadline` so volunteers have viable dispatch margin.

## Input Integrity Checks

The evaluator rejects missing fields, non-positive meal quantities, future `preparedAt` timestamps, and inverted pickup windows (`pickupWindowStart >= pickupWindowEnd`).
