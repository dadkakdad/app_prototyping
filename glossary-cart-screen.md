## Glossary — Cart Screen UI Clone

This glossary defines canonical component names, their purpose, key states/props, and mapping to CSS classes in `grocery-app-prototype.html`. Use these names for future development.

### Design Tokens
- **Color tokens**: CSS variables `--color-*` control semantic colors (primary, green/red accents, text, backgrounds, borders, blue badge).
- **Typography tokens**: `--font-family`, `--font-size-*` control consistent type scale.
- **Spacing tokens**: `--spacing-*` define vertical/horizontal rhythm.
- **Radius tokens**: `--radius-*` standardize rounded corners.

### StatusBar
- **Purpose**: Mimics iOS status area (time, connectivity, battery) at top of screen.
- **Key elements**: `.status-bar`, `.status-icons`.
- **Notes**: Presentational; no navigation or business logic.

### Header
- **Purpose**: Page header for the cart with title and quick actions.
- **Key elements**: `.header`, `.header-title`, `.header-actions`, `.icon-btn`.
- **Common actions**: share/upload, search, clear cart (icons placeholder).

### StoreTabs
- **Purpose**: Toggle between store contexts (e.g., “лавка у дома”, “большая лавка”). Impacts assortment/pricing.
- **Key elements**: `.tabs`, `.tab`, `.tab.active`, `.tab-icon`, `.tab-content`, `.tab-title`, `.tab-subtitle`.
- **State**: `active` on selected `.tab`.
- **Data mapping**: `data-store` attribute → `cart.storeType`.

### DeliveryInfo
- **Purpose**: Shows delivery pricing with membership benefit and threshold to next discount.
- **Key elements**: `.delivery-info`, `.delivery-header`, `.delivery-text`, `.delivery-main`, `.delivery-fee-value`, `.delivery-hint`, `.badge-green`.
- **Notes**: “♣️ Пай” membership indicator displayed inline.

### ProgressBar
- **Purpose**: Visualizes progress toward discount threshold.
- **Key elements**: `.progress-bar`, `.progress-track`, `.progress-fill`, `.progress-labels`.
- **State**: `width` of `.progress-fill` expresses progress.

### VisualContainer
- **Purpose**: Visually groups related components into a card-like element with a white background and rounded corners.
- **Key elements**: `.visual-container`.

### CartItemsList
- **Purpose**: Container for items in cart.
- **Key elements**: `.cart-items`.

### CartItem
- **Purpose**: Displays a single product row.
- **Key elements**: `.cart-item`, `.item-image`, `.item-details`, `.item-name`, `.item-price`, `.price-current`, `.price-old`, `.price-weight`.
- **State**: `.price-current.has-discount` is applied when an item has a sale price.
- **Notes**: Old price is optional and shown with strikethrough.

### QuantityControls
- **Purpose**: Increment/decrement item quantity.
- **Key elements**: `.quantity-controls`, `.qty-btn`, `.qty-value`.
- **Behavior**: `updateQuantity(change)` updates UI and persisted state.

### OrderSummary
- **Purpose**: Summarizes additional charges/metadata (e.g., packaging cost).
- **Key elements**: `.order-summary`, `.summary-row`, `.summary-label`, `.summary-value`.

### PackageReturn
- **Purpose**: Opt-in to return bags and earn points.
- **Key elements**: `.package-return`, `.return-option`, `.return-text`, `.return-title`, `.return-link`, `.toggle-switch`, `.toggle-switch.active`.
- **Behavior**: `toggleSwitch(element)` toggles UI and `packaging.returnable`.

### PromoBanner
- **Purpose**: Highlights active promo applicable to a product.
- **Key elements**: `.promo-banner`, `.promo-card`, `.promo-icon`, `.promo-icon-ticket`, `.promo-text`.

### PromoCodeList
- **Purpose**: An entry point to the list of active promo codes.
- **Notes**: Currently implemented as a simple text link without a dedicated class.

### Recommendations
- **Purpose**: Horizontally scrollable list of recommended items.
- **Key elements**: `.recommendations`, `.recommendations-header`, `.recommendations-grid`, `.recommendation-card`, `.rec-image`, `.rec-badge`.

### CheckoutFooter
- **Purpose**: Fixed call-to-action bar for checkout with ETA and price.
- **Key elements**: `.checkout-footer`, `.checkout-btn`, `.checkout-time`, `.checkout-price`, `.price-final`, `.price-original`.
- **State**: Button is always visible; original price optional (strikethrough).

### BottomNavigation
- **Purpose**: App-wide navigation with cart entry point and badge.
- **Key elements**: `.bottom-nav`, `.nav-item`, `.nav-item.active`, `.nav-icon`, `.nav-badge`.

### ContentSpacer
- **Purpose**: Ensures scrollable content is not overlapped by fixed footer/nav.
- **Key elements**: `.content-spacer`.

### Common UI Elements
- **IconButton**: `.icon-btn` neutral clickable icon (header, cards).
- **BadgeGreen**: `.badge-green` positive/discount badge.
- **RecBadge / NavBadge**: `.rec-badge`, `.nav-badge` small labels/counters.

### Data Model Entities (for naming alignment)
- **User**: `user.hasPlus`, `user.location` affect perks and copy.
- **Cart**: `cart.storeType`, `cart.items[]`, `cart.delivery`, `cart.packaging`.
- **Delivery**: `delivery.cost`, `costWithoutPlus`, `discount`, `time`, `minForDiscount`, `currentTotal`.
- **Packaging**: `packaging.cost`, `returnable`, `points`.
- **Promotions**: `promos[]` (id, discount, product, active).
- **Recommendations**: `recommendations[]` (id, name, emoji, promo).

### Behavioral Utilities
- **Session Persistence**: Initial `appData` seeded and persisted in `sessionStorage`.
- **Tab Switching**: Click handler toggles `.tab.active` and updates `cart.storeType`.
- **iOS Pull-To-Refresh Guard**: Prevents bounce refresh at scrollTop.

Use these names (e.g., `StatusBar`, `Header`, `StoreTabs`, `DeliveryInfo`, `ProgressBar`, `CartItem`, `QuantityControls`, `OrderSummary`, `PackageReturn`, `PromoBanner`, `Recommendations`, `CheckoutFooter`, `BottomNavigation`, `ContentSpacer`) as the canonical component identifiers going forward. 