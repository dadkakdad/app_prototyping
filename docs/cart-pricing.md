## Cart Pricing Logic

This document explains how the cart total is computed and which UI elements display which amounts. All tunables live in `config/app-config.js` and product data in `config/items-config.js`.

### Inputs
- **Catalog item** (`ITEMS_CONFIG.catalog[refId]`): `price`, optional `oldPrice`, `weight`, `emoji`.
- **Cart item**: `{ refId, quantity }`.
- **User** (`appData.user`): `payWithYandexPay` (or `hasPlus`), `deliverySpeed`.
- **Config** (`APP_CONFIG`):
  - `packaging.fee`
  - `delivery.tiers.regular | yandexPay`: ordered thresholds with fees
  - `cartDiscount.tiers`: thresholds with `rate` (fraction) and `percent`
  - `currency`

### Computation Steps
1) Items totals
- `itemsFinalTotal = Σ (item.price × quantity)`
- `itemsOriginalTotal = Σ ((item.oldPrice || item.price) × quantity)`

2) Delivery fee (not discounted by item promos or cart-size discount)
- Select schedule by `user.payWithYandexPay`
- Pick the tier with the greatest `threshold <= itemsFinalTotal`
- Result is `deliveryFee`

3) Packaging fee
- `packagingFee = APP_CONFIG.packaging.fee`

4) Cart-size discount (applied to final price)
- Determine `rate` by the highest tier where `itemsFinalTotal > threshold`
- Compute `preDiscountFinalTotal = itemsFinalTotal + packagingFee + deliveryFee`
- `finalAfterDiscount = round(preDiscountFinalTotal × (1 - rate))`

5) Checkout totals and displays
- Checkout footer:
  - `price-original` = `itemsOriginalTotal + packagingFee + deliveryFee`
  - `price-final` = `finalAfterDiscount`
- Store tabs subtitle:
  - Shows items-only total: `itemsFinalTotal` (excludes delivery & packaging)

### Progress & Milestones
- The progress bar provides a unified visual track for all delivery fee and cart-size discount tiers.
- **Progress Fill**: The green fill percentage is calculated as `itemsFinalTotal / maxThreshold`, where `maxThreshold` is the highest threshold defined across all delivery and discount tiers.
- **Milestones**: Both delivery fee tiers and cart discount tiers are plotted as milestones along the track.
  - Milestones that the user has reached are visually highlighted.
- **Hint Text**: The hint text below the progress bar (`#delivery-hint`) dynamically shows the amount remaining to reach the next *delivery fee* tier (e.g., "Ещё 282₽, и будет 79₽").

### Threshold Semantics
- Delivery tiers: thresholds are inclusive lower bounds; chosen by `max(threshold <= itemsFinalTotal)`.
- Cart discount tiers: discount applies when `itemsFinalTotal > threshold` (strictly greater).

### UI Mapping
- `DeliveryInfo` line shows both fees:
  - With Yandex Pay and without, based on current `itemsFinalTotal`
- Milestones on the progress bar are highlighted to show the currently active `deliveryFee` and any achieved cart-size discounts.
- `CheckoutFooter`:
  - Left time: `user.deliverySpeed`
  - Right prices: `price-final` (big), `price-original` (struck-through, hidden if equal)
- `StoreTabs` subtitle: `itemsFinalTotal`

### Configuration Knobs
- `config/app-config.js`:
  - Change `packaging.fee`, delivery tiers, discount tiers, currency, and user defaults
- `config/items-config.js`:
  - Add/edit products; referenced in cart via `refId`

### Persistence & Migration
- State persists in `sessionStorage` under `appData`
- A schema version migrates legacy items to `{ refId, quantity }`

### Example
Given one item `raspberry_artfruit` (359→449 old), qty 2, Yandex Pay on, packaging 12, tiers per default:
- `itemsFinalTotal = 359×2 = 718`
- `itemsOriginalTotal = 449×2 = 898`
- Delivery fee (YP, 0..999 → 111): `deliveryFee = 111`
- `preDiscountFinalTotal = 718 + 12 + 111 = 841`
- Cart-size discount: none (`718 ≤ 1000`), `rate = 0`
- `finalAfterDiscount = 841`
- Displays:
  - Store tab: `718₽`
  - Checkout: final `841₽`, original `898 + 12 + 111 = 1021₽`

### Notes
- All amounts are whole rubles; rounding uses standard `Math.round` after discount.
- Cart-size discount does not alter delivery tier selection. 