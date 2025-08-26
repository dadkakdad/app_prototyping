// Mock Data Store
const SCHEMA_VERSION = 2;
const appData = {
    user: {
        id: '12345',
        hasPlus: APP_CONFIG.userDefaults.hasPlus,
        payWithYandexPay: APP_CONFIG.userDefaults.payWithYandexPay,
        location: APP_CONFIG.userDefaults.location,
        deliverySpeed: APP_CONFIG.userDefaults.deliverySpeed
    },
    activeCartId: 'home',
    carts: {
        home: {
            items: [
                { refId: 'raspberry_artfruit', quantity: 2 }
            ],
            delivery: {
                time: APP_CONFIG.userDefaults.deliverySpeed,
                minForDiscount: 1151,
                currentTotal: 510
            },
            packaging: {
                cost: APP_CONFIG.packaging.fee,
                returnable: false,
                points: 12
            }
        },
        big: {
            items: [
                { refId: 'snickers_ice_cream', quantity: 2 }
            ],
            delivery: {},
            packaging: { cost: APP_CONFIG.packaging.fee }
        }
    },
    recommendations: [
        {id: 'snickers', name: 'Snickers', emoji: '🍫', promo: '×2'},
        {id: 'drink_generic', name: 'Напиток', emoji: '🥤'},
        {id: 'cookie_generic', name: 'Печенье', emoji: '🍪'}
    ],
    promos: [
        {
            id: 'kinder50',
            discount: 50,
            product: 'Kinder Сюрприз с фиксиками',
            active: true
        }
    ],
    meta: { version: SCHEMA_VERSION }
};

// Schema migration utilities
function guessRefIdFromLegacyItem(legacy) {
    // Try match by explicit legacy id/name; fallback to known slug
    const catalog = (window.ITEMS_CONFIG && window.ITEMS_CONFIG.catalog) || {};
    // Match by name
    for (const key in catalog) {
        if (catalog[key].name === legacy.name) return key;
    }
    // Fallback legacy id mapping
    if (legacy.id === 1) return 'raspberry_artfruit';
    return null;
}

    function migrateDataSchema(data) {
        const migrated = JSON.parse(JSON.stringify(data || {}));
        migrated.meta = migrated.meta || {};
        const currentVersion = Number(migrated.meta.version || 0);
        if (currentVersion >= SCHEMA_VERSION) {
            if (!migrated.carts) { // Handle case where old structure exists despite version
                 migrated.carts = { home: migrated.cart || {}, big: { items:[] } };
                 migrated.activeCartId = migrated.activeCartId || 'home';
                 delete migrated.cart;
            }
            return migrated;
        }

        // If we are migrating from a pre-multi-cart version
        if (migrated.cart) {
            migrated.carts = {
                home: migrated.cart,
                big: { items: [], delivery: {}, packaging: { cost: APP_CONFIG.packaging.fee } }
            };
            delete migrated.cart;
        }
        migrated.activeCartId = migrated.activeCartId || 'home';
        migrated.carts = migrated.carts || { home: {items:[]}, big: {items:[]} };

        // Ensure user defaults
        migrated.user = migrated.user || {};
        if (migrated.user.hasPlus == null) migrated.user.hasPlus = APP_CONFIG.userDefaults.hasPlus;
        if (migrated.user.payWithYandexPay == null) migrated.user.payWithYandexPay = APP_CONFIG.userDefaults.payWithYandexPay;
        if (!migrated.user.location) migrated.user.location = APP_CONFIG.userDefaults.location;
        if (!migrated.user.deliverySpeed) migrated.user.deliverySpeed = APP_CONFIG.userDefaults.deliverySpeed;

        // Update items in both carts if they exist
        for (const cartId in migrated.carts) {
            const cart = migrated.carts[cartId] || { items: [] };
            const items = Array.isArray(cart.items) ? cart.items : [];
            cart.items = items.map(it => {
                if (it && (it.refId || typeof it.refId === 'string')) {
                    return { refId: it.refId, quantity: Number(it.quantity) || 1 };
                }
                const refId = guessRefIdFromLegacyItem(it || {});
                return { refId: refId || 'raspberry_artfruit', quantity: Number(it?.quantity) || 1 };
            });

            // Packaging defaults
            cart.packaging = cart.packaging || {};
            if (cart.packaging.cost == null) cart.packaging.cost = APP_CONFIG.packaging.fee;
            if (cart.packaging.returnable == null) cart.packaging.returnable = false;

            // Delivery defaults
            cart.delivery = cart.delivery || {};
            if (!cart.delivery.time) cart.delivery.time = APP_CONFIG.userDefaults.deliverySpeed;
        }

        migrated.meta.version = SCHEMA_VERSION;
        return migrated;
    }

    // Store/migrate data in sessionStorage for persistence
    (function seedOrMigrate(){
        sessionStorage.clear(); // Force a one-time reset
        let data;
        try {
            data = JSON.parse(sessionStorage.getItem('appData'));
        } catch (e) {
            data = null;
        }
        if (!data) {
            data = appData;
        }
        const migrated = migrateDataSchema(data);
        sessionStorage.setItem('appData', JSON.stringify(migrated));
    })();

function getActiveCart() {
    const data = JSON.parse(sessionStorage.getItem('appData'));
    if (data && data.carts && data.carts[data.activeCartId]) {
        return data.carts[data.activeCartId];
    }
    // Return a default empty cart structure to prevent errors
    return { items: [], delivery: {}, packaging: {} };
}

// Toggle switch for package return
function toggleSwitch(element) {
    element.classList.toggle('active');
    
    // Update stored data
    const data = JSON.parse(sessionStorage.getItem('appData'));
    const cart = data.carts[data.activeCartId];
    cart.packaging.returnable = element.classList.contains('active');
    sessionStorage.setItem('appData', JSON.stringify(data));
}

// Resolve item data from catalog by refId
function resolveItemByRef(refId) {
    return (window.ITEMS_CONFIG && window.ITEMS_CONFIG.catalog && window.ITEMS_CONFIG.catalog[refId]) || null;
}

// Render the (single) cart item row based on catalog
function renderCartItems() {
    const cart = getActiveCart();
    const cartContainer = document.querySelector('.cart-items');
    cartContainer.innerHTML = ''; // Clear existing items

    if (!cart || !cart.items || cart.items.length === 0) {
        cartContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary);">Корзина пуста</p>';
        return;
    }

    cart.items.forEach(cartItem => {
        const itemDef = resolveItemByRef(cartItem.refId);
        if (!itemDef) return;

        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';

        const priceOldHTML = itemDef.oldPrice && itemDef.oldPrice > itemDef.price 
            ? `<span class="price-old">${formatPrice(itemDef.oldPrice)}</span>` 
            : '';
        
        const imageHTML = itemDef.image 
            ? `<img src="${itemDef.image}" alt="${itemDef.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--radius-sm);">`
            : itemDef.emoji || '';
        
        const weightHTML = itemDef.weight ? `<span class="price-weight">· ${itemDef.weight}</span>` : '';
        const hasDiscount = itemDef.oldPrice && itemDef.oldPrice > itemDef.price;

        itemEl.innerHTML = `
            <div class="item-image">${imageHTML}</div>
            <div class="item-details">
                <div class="item-name">${itemDef.name}</div>
                <div class="item-price">
                    <span class="price-current ${hasDiscount ? 'has-discount' : ''}">${formatPrice(itemDef.price)}</span>
                    ${priceOldHTML}
                    ${weightHTML}
                </div>
            </div>
            <div class="quantity-controls">
                <button class="qty-btn" onclick="updateQuantity(event, '${cartItem.refId}', -1)">−</button>
                <span class="qty-value">${cartItem.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(event, '${cartItem.refId}', 1)">+</button>
            </div>
        `;
        cartContainer.appendChild(itemEl);
    });
}

// Helpers: formatting and totals
function formatPrice(value) {
    return `${value}${APP_CONFIG.currency}`;
}

function computeCartTotals(cart) {
    if (!cart) return { itemsFinalTotal: 0, itemsOriginalTotal: 0, totalQuantity: 0 };
    let itemsFinalTotal = 0;
    let itemsOriginalTotal = 0;
    let totalQuantity = 0;
    (cart.items || []).forEach(ci => {
        const def = resolveItemByRef(ci.refId);
        if (!def) return;
        const qty = Number(ci.quantity) || 0;
        totalQuantity += qty;
        const price = Number(def.price) || 0;
        const old = def.oldPrice != null ? Number(def.oldPrice) : price;
        itemsFinalTotal += price * qty;
        itemsOriginalTotal += old * qty;
    });
    return { itemsFinalTotal, itemsOriginalTotal, totalQuantity };
}

function computeTotalQuantityAllCarts(data) {
    if (!data || !data.carts) return 0;
    let totalQuantity = 0;
    for (const cartId in data.carts) {
        const cart = data.carts[cartId];
        if (cart && cart.items) {
            cart.items.forEach(item => {
                totalQuantity += Number(item.quantity) || 0;
            });
        }
    }
    return totalQuantity;
}

function computeTotals(data) {
    const cart = data.carts[data.activeCartId];
    return computeCartTotals(cart);
}

// Determine if user uses Yandex Pay card
function isYandexPayEnabled(data) {
    return Boolean(data?.user?.payWithYandexPay ?? data?.user?.hasPlus);
}

// Delivery fee schedule based on items total and payment method
function getDeliveryFee(itemsTotal, withYandexPay) {
    const schedule = withYandexPay ? APP_CONFIG.delivery.tiers.yandexPay : APP_CONFIG.delivery.tiers.regular;
    let fee = 0;
    for (let i = schedule.length - 1; i >= 0; i--) {
        if (itemsTotal >= schedule[i].threshold) {
            fee = schedule[i].fee;
            break;
        }
    }
    return fee;
}

// Cart-size discount rate based on items total
function getCartDiscountRate(itemsTotal) {
    for (const tier of APP_CONFIG.cartDiscount.tiers) {
        if (itemsTotal > tier.threshold) return tier.rate;
    }
    return 0.0;
}

// Next discount threshold and percent
function getNextDiscountTarget(itemsTotal) {
    // Find next higher threshold from config (ascending compute)
    const thresholds = [...APP_CONFIG.cartDiscount.tiers]
        .map(t => ({ amount: t.threshold, percent: t.percent }))
        .sort((a, b) => a.amount - b.amount);
    for (const t of thresholds) {
        if (itemsTotal <= t.amount) return { nextAmount: t.amount, nextPercent: t.percent };
    }
    return { nextAmount: null, nextPercent: thresholds[thresholds.length - 1].percent };
}

function renderMilestones() {
    const data = JSON.parse(sessionStorage.getItem('appData'));
    const usesYandexPay = isYandexPayEnabled(data);
    const deliveryTiers = [...(usesYandexPay ? APP_CONFIG.delivery.tiers.yandexPay : APP_CONFIG.delivery.tiers.regular)].sort((a,b) => a.threshold - b.threshold);
    const discountTiers = APP_CONFIG.cartDiscount.tiers;
    const track = document.querySelector('.progress-bar-track');
    
    track.innerHTML = '<div class="progress-bar-fill"></div>';

    const hereMarker = document.createElement('div');
    hereMarker.className = 'milestone';
    hereMarker.id = 'here-marker';
    const hereLabel = document.createElement('div');
    hereLabel.className = 'milestone-label-top';
    hereLabel.textContent = 'Вы здесь';
    hereMarker.appendChild(hereLabel);
    track.appendChild(hereMarker);

    const allTiers = [
        ...deliveryTiers.map(t => ({ ...t, type: 'delivery' })),
        ...discountTiers.map(t => ({ ...t, type: 'discount' }))
    ];
    const maxThreshold = Math.max(...allTiers.map(t => t.threshold));
    
    allTiers.forEach(tier => {
        const milestoneEl = document.createElement('div');
        milestoneEl.className = 'milestone';
        milestoneEl.dataset.threshold = tier.threshold;
        
        let labelText = '';
        let iconHTML = '';

        if (tier.type === 'delivery') {
            milestoneEl.dataset.fee = tier.fee;
            labelText = `${tier.fee}₽`;
        } else { // discount
            if (tier.threshold === 0) return;
            milestoneEl.classList.add('discount');
            milestoneEl.dataset.percent = tier.percent;
            labelText = `${tier.percent}%`;
            iconHTML = '<span class="discount-icon">%</span> ';
        }
        
        const positionPct = (tier.threshold / maxThreshold) * 100;
        milestoneEl.style.left = `${positionPct}%`;

        if (positionPct === 0) {
            milestoneEl.classList.add('milestone-first');
        }
        if (positionPct === 100) {
            milestoneEl.classList.add('milestone-last');
        }

        milestoneEl.innerHTML = `
            <div class="milestone-label">${iconHTML}${labelText}</div>
        `;
        track.appendChild(milestoneEl);
    });
}

function updateDeliveryInfo() {
    const data = JSON.parse(sessionStorage.getItem('appData'));
    const { itemsFinalTotal } = computeTotals(data);
    const usesYandexPay = isYandexPayEnabled(data);

    const deliveryTiers = usesYandexPay ? APP_CONFIG.delivery.tiers.yandexPay : APP_CONFIG.delivery.tiers.regular;
    const deliveryFee = getDeliveryFee(itemsFinalTotal, usesYandexPay);
    const originalFee = getDeliveryFee(itemsFinalTotal, false);

    document.getElementById('delivery-cost').innerHTML = `Доставка <strong class="delivery-fee-value">${deliveryFee}₽</strong>`;
    const discountBadge = document.getElementById('delivery-discount');
    const originalCostEl = document.getElementById('delivery-original-cost');

    if (usesYandexPay && deliveryFee < originalFee) {
        const discountPct = Math.round((1 - deliveryFee / originalFee) * 100);
        discountBadge.textContent = `-${discountPct}%`;
        discountBadge.style.display = 'inline-block';
        originalCostEl.textContent = `/ без: ${originalFee}₽`;
    } else {
        discountBadge.style.display = 'none';
        originalCostEl.textContent = '';
    }

    const nextTier = deliveryTiers.find(tier => itemsFinalTotal < tier.threshold);
    const hintEl = document.getElementById('delivery-hint');
    if (nextTier) {
        const remaining = nextTier.threshold - itemsFinalTotal;
        hintEl.textContent = `Ещё ${remaining}₽, и будет ${nextTier.fee}₽`;
    } else {
        hintEl.textContent = deliveryFee === 0 ? 'Доставка бесплатная' : '';
    }

    const progressBarFill = document.querySelector('.progress-bar-fill');
    const allTiers = [
        ...deliveryTiers.map(t => ({ ...t, type: 'delivery' })),
        ...APP_CONFIG.cartDiscount.tiers.map(t => ({ ...t, type: 'discount' }))
    ];
    const maxThreshold = Math.max(...allTiers.map(t => t.threshold || 0));

    const hereMarker = document.getElementById('here-marker');
    if (hereMarker) {
        const herePosition = Math.min(100, (itemsFinalTotal / maxThreshold) * 100);
        hereMarker.style.left = `${herePosition}%`;
    }

    const progressPercentage = Math.min(100, (itemsFinalTotal / maxThreshold) * 100);
    progressBarFill.style.width = `${progressPercentage}%`;

    const milestones = document.querySelectorAll('.milestone');
    milestones.forEach(milestone => {
        const threshold = parseInt(milestone.dataset.threshold);
        if (isNaN(threshold)) return;

        const isComplete = itemsFinalTotal >= threshold;
        milestone.classList.toggle('complete', isComplete);

        if (milestone.classList.contains('discount')) {
            // No special 'active' state for discounts, only 'complete'
        } else {
            const fee = parseInt(milestone.dataset.fee);
            const isActive = deliveryFee === fee;
            milestone.classList.toggle('active', isActive);
        }
    });
}

function populatePromoBanner() {
    if (window.APP_CONFIG && APP_CONFIG.promoBanner) {
        const badgeEl = document.getElementById('promo-badge-text');
        const textEl = document.getElementById('promo-main-text');

        if (badgeEl) {
            badgeEl.textContent = APP_CONFIG.promoBanner.badgeText;
        }
        if (textEl) {
            textEl.innerHTML = APP_CONFIG.promoBanner.mainText;
        }
    }
}

function updateTabIcons() {
    const data = JSON.parse(sessionStorage.getItem('appData'));
    if (!data || !data.carts) return;

    document.querySelectorAll('.tab').forEach(tab => {
        const storeId = tab.dataset.store;
        const cart = data.carts[storeId];
        const iconContainer = tab.querySelector('.tab-icon');
        if (!iconContainer) return;

        const firstItem = cart && cart.items.length > 0 ? resolveItemByRef(cart.items[0].refId) : null;

        if (firstItem && firstItem.image) {
            iconContainer.innerHTML = `<img src="${firstItem.image}" alt="${firstItem.name}">`;
        } else if (firstItem && firstItem.emoji) {
            iconContainer.innerHTML = firstItem.emoji;
        } else {
            iconContainer.innerHTML = storeId === 'home' ? '🏪' : '🏬';
        }
    });
}

function updateAllTabSubtitles() {
    const data = JSON.parse(sessionStorage.getItem('appData'));
    if (!data || !data.carts) return;

    for (const cartId in data.carts) {
        const cart = data.carts[cartId];
        const { itemsFinalTotal } = computeCartTotals(cart);
        const tab = document.querySelector(`.tab[data-store="${cartId}"]`);
        if (tab) {
            const subtitleEl = tab.querySelector('.tab-subtitle');
            if (subtitleEl) {
                subtitleEl.textContent = formatPrice(itemsFinalTotal);
            }
        }
    }
}

// Recalculate UI: totals, progress, badges
function recalculateCart() {
    const data = JSON.parse(sessionStorage.getItem('appData'));
    if (!data || !data.carts) return;

    const { itemsFinalTotal, itemsOriginalTotal, totalQuantity } = computeTotals(data);

    // Delivery fee based on items total and payment method
    const usesYandexPay = isYandexPayEnabled(data);
    const deliveryFeeWithYP = getDeliveryFee(itemsFinalTotal, true);
    const deliveryFeeWithoutYP = getDeliveryFee(itemsFinalTotal, false);
    const deliveryFee = usesYandexPay ? deliveryFeeWithYP : deliveryFeeWithoutYP;

    // Update bottom nav cart badge
    const navBadge = document.querySelector('.bottom-nav .nav-badge');
    if (navBadge) {
        const totalQuantityAllCarts = computeTotalQuantityAllCarts(data);
        if (totalQuantityAllCarts > 0) {
            navBadge.textContent = String(totalQuantityAllCarts);
            navBadge.style.display = '';
        } else {
            navBadge.style.display = 'none';
        }
    }

    // Update tab subtitles and icons
    updateAllTabSubtitles();
    updateTabIcons();

    // Persist currentTotal for delivery section
    const activeCart = data.carts[data.activeCartId];
    if (activeCart) {
        if (!activeCart.delivery) {
            activeCart.delivery = {};
        }
        activeCart.delivery.currentTotal = itemsFinalTotal;
    }
    sessionStorage.setItem('appData', JSON.stringify(data));
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        if (this.classList.contains('active')) return;

        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // Update store type in data
        const storeType = this.dataset.store;
        const data = JSON.parse(sessionStorage.getItem('appData'));
        data.activeCartId = storeType;
        sessionStorage.setItem('appData', JSON.stringify(data));

        // Recalc to refresh tab subtitle
        renderCartItems();
        renderRecommendations(storeType);
        recalculateCart();
        renderMilestones();
        updateDeliveryInfo();
        updateFloatingCheckoutButton();
    });
});

// Prevent pull-to-refresh on iOS
let lastY = 0;
document.addEventListener('touchstart', function(e) {
    lastY = e.touches[0].clientY;
}, {passive: false});

document.addEventListener('touchmove', function(e) {
    const y = e.touches[0].clientY;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    
    if (scrollTop === 0 && y > lastY) {
        e.preventDefault();
    }
}, {passive: false});

// Prevent pinch-to-zoom on iOS
document.addEventListener('touchmove', function (event) {
  if (event.scale !== 1) { event.preventDefault(); }
}, { passive: false });

// Initialize
window.addEventListener('load', function() {
    // Load saved state
    const data = JSON.parse(sessionStorage.getItem('appData'));
    
    // Set the correct active tab on page load
    if (data && data.activeCartId) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        const activeTab = document.querySelector(`.tab[data-store="${data.activeCartId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }
    
    populatePromoBanner();

    const activeCart = getActiveCart();

    if (activeCart.packaging && activeCart.packaging.returnable) {
        document.getElementById('packageToggle').classList.add('active');
    }
    
    // Track delivery status for confetti effect
    let wasDeliveryFree = false;
    const initialTotals = computeTotals(data);
    const initialFee = getDeliveryFee(initialTotals.itemsFinalTotal, isYandexPayEnabled(data));
    wasDeliveryFree = initialFee === 0;

    // Sync delivery ETA from user state
    const timeEl = document.querySelector('.checkout-time');
    if (timeEl && data?.user?.deliverySpeed) {
        timeEl.textContent = data.user.deliverySpeed;
    }

    // Render items UI from catalog
    renderCartItems();
    renderRecommendations(data ? data.activeCartId : 'home');

    // Initial totals/progress
    recalculateCart();
    renderMilestones();
    updateDeliveryInfo();
    updateFloatingCheckoutButton(wasDeliveryFree); // Initial render
});

// Render recommendations
function renderRecommendations(activeCartId) {
    const recKey = `recommendationItems_${activeCartId}`;
    const recs = (window.APP_CONFIG && window.APP_CONFIG[recKey]) || [];
    const grid = document.querySelector('.recommendations-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const data = JSON.parse(sessionStorage.getItem('appData'));
    const cart = (data && data.carts && data.carts[activeCartId]) || { items: [] };

    recs.forEach(itemId => {
        const itemDef = resolveItemByRef(itemId);
        if (!itemDef) return;

        const card = document.createElement('div');
        card.className = 'recommendation-card';

        const priceOldHTML = itemDef.oldPrice && itemDef.oldPrice > itemDef.price 
            ? `<span class="price-old">${formatPrice(itemDef.oldPrice)}</span>` 
            : '';
        
        const hasDiscount = itemDef.oldPrice && itemDef.oldPrice > itemDef.price;
        const discount = hasDiscount ? Math.round((1 - (itemDef.price / itemDef.oldPrice)) * 100) : 0;
        
        const discountBadgeHTML = hasDiscount 
            ? `<div class="rec-discount-badge">-${discount}%</div>`
            : '';
        
        const imageHTML = itemDef.image
            ? `<img src="${itemDef.image}" alt="${itemDef.name}" class="rec-image">`
            : `<div class="rec-image" style="font-size: 32px;">${itemDef.emoji || ''}</div>`;

        const itemInCart = cart.items.find(it => it.refId === itemDef.id);
        const quantity = itemInCart ? itemInCart.quantity : 0;

        let controlsHTML = '';
        if (quantity > 0) {
            controlsHTML = `
                <div class="rec-quantity-controls">
                    <button class="qty-btn" onclick="updateQuantity(event, '${itemDef.id}', -1)">−</button>
                    <span class="qty-value">${quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(event, '${itemDef.id}', 1)">+</button>
                </div>
            `;
        } else {
            controlsHTML = `<button class="rec-add-btn" onclick="updateQuantity(event, '${itemDef.id}', 1)">+</button>`;
        }

        card.innerHTML = `
            <div class="rec-image-container">
                ${imageHTML}
                ${discountBadgeHTML}
                ${controlsHTML}
            </div>
            <div class="rec-details">
                <div class="rec-price">
                    <span class="price-current ${hasDiscount ? 'has-discount' : ''}">${formatPrice(itemDef.price)}</span>
                    ${priceOldHTML}
                </div>
                <div class="rec-name">${itemDef.name} <span class="rec-item-weight">${itemDef.weight}</span></div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Quantity controls
function updateQuantity(event, refId, change) {
    const isFromRecommendations = event.target.closest('.recommendations');

    const data = JSON.parse(sessionStorage.getItem('appData'));
    const cart = data.carts[data.activeCartId];
    const item = cart.items.find(it => it.refId === refId);

    const isAddingFirstItemFromRecs = isFromRecommendations && !item && change > 0;
    
    let scrollY = null;
    let scrollHeightBefore = null;

    if (isAddingFirstItemFromRecs) {
        scrollY = window.scrollY;
        scrollHeightBefore = document.documentElement.scrollHeight;
    }

    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            // Remove item if quantity is 0 or less
            cart.items = cart.items.filter(it => it.refId !== refId);
        }
    } else if (change > 0) {
        cart.items.push({ refId, quantity: change });
    }
    
    sessionStorage.setItem('appData', JSON.stringify(data));
    
    renderCartItems();
    renderRecommendations(data.activeCartId);
    recalculateCart();
    updateDeliveryInfo();

    if (isAddingFirstItemFromRecs) {
        requestAnimationFrame(() => {
            const scrollHeightAfter = document.documentElement.scrollHeight;
            const heightDifference = scrollHeightAfter - scrollHeightBefore;
            if (heightDifference > 0) {
                window.scrollTo({ top: scrollY + heightDifference, behavior: 'instant' });
            }
        });
    }

    // After updating cart, also update the floating checkout button
    updateFloatingCheckoutButton();
}

function updateFloatingCheckoutButton() {
    // This function can be called from different places, so we need to ensure wasDeliveryFree is accessible.
    // A better implementation might use a small state management object, but a window scope variable is simple for this prototype.
    if (typeof window.wasDeliveryFree === 'undefined') {
        window.wasDeliveryFree = false; // Initialize if not present
    }

    const data = JSON.parse(sessionStorage.getItem('appData'));
    if (!data) return;

    const { itemsFinalTotal } = computeTotals(data);
    const usesYandexPay = isYandexPayEnabled(data);
    
    // Use the same delivery fee logic as DeliveryInfo
    const deliveryTiers = (usesYandexPay ? APP_CONFIG.delivery.tiers.yandexPay : APP_CONFIG.delivery.tiers.regular)
        .slice() // Create a copy to sort
        .sort((a, b) => a.threshold - b.threshold);

    const currentFee = getDeliveryFee(itemsFinalTotal, usesYandexPay);

    // Find the next tier for a lower delivery fee
    let nextTier = null;
    for (let i = 0; i < deliveryTiers.length; i++) {
        if (itemsFinalTotal < deliveryTiers[i].threshold) {
            nextTier = deliveryTiers[i];
            break;
        }
    }

    const checkoutButton = document.getElementById('checkout-button');
    const mainRowEl = checkoutButton ? checkoutButton.querySelector('.button-main-row') : null;
    const progressCircle = document.getElementById('progress-ring-circle');

    if (!checkoutButton || !mainRowEl || !progressCircle) return;
    
    // Setup for progress ring
    const radius = progressCircle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;

    // Recalculate full total for display
    const packagingFee = Number(data.carts[data.activeCartId].packaging?.cost) || 0;
    const preDiscountFinalTotal = itemsFinalTotal + packagingFee + currentFee;
    const rate = getCartDiscountRate(itemsFinalTotal);
    const finalAfterDiscount = Math.round(preDiscountFinalTotal * (1 - rate));
    
    // Find free delivery threshold
    const freeDeliveryTier = deliveryTiers.find(tier => tier.fee === 0);
    const freeDeliveryThreshold = freeDeliveryTier ? freeDeliveryTier.threshold : -1;

    let progressPercentage = 0;
    if (freeDeliveryThreshold > 0) {
        progressPercentage = (itemsFinalTotal / freeDeliveryThreshold) * 100;
    } else if (currentFee === 0) {
        progressPercentage = 100;
    }
    
    const offset = circumference - (Math.min(100, progressPercentage) / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;

    const isNowFree = currentFee === 0;

    if (isNowFree) {
        // Free delivery state
        checkoutButton.classList.add('free-delivery');
        mainRowEl.innerHTML = '<span class="congrats-text">🎉<br>Бесплатно</span>';
        
        if (!window.wasDeliveryFree) {
            // Trigger confetti only on the transition to free
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    } else {
        // Default state
        checkoutButton.classList.remove('free-delivery');
        mainRowEl.innerHTML = `
            <span class="total-price" id="checkout-price">${formatPrice(finalAfterDiscount)}</span>
            <span class="checkout-label">Доставка ${formatPrice(currentFee)}</span>
        `;
    }

    // Update the state for the next run
    window.wasDeliveryFree = isNowFree;
} 