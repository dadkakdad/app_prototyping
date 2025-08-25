(function(){
    // Global app configuration for fees, discounts, and user defaults
    window.APP_CONFIG = {
        currency: '₽',
        packaging: {
            fee: 12
        },
        delivery: {
            tiers: {
                // thresholds are inclusive lower bounds
                regular: [
                    { threshold: 0, fee: 139 },
                    { threshold: 1000, fee: 99 },
                    { threshold: 2000, fee: 0 }
                ],
                yandexPay: [
                    { threshold: 0, fee: 111 },
                    { threshold: 1000, fee: 79 },
                    { threshold: 2000, fee: 0 }
                ]
            }
        },
        cartDiscount: {
            // Sorted descending by threshold; rate is fraction (0.10 = 10%)
            tiers: [
                { threshold: 3500, rate: 0.30, percent: 30 },
                { threshold: 2500, rate: 0.20, percent: 20 },
                { threshold: 1500, rate: 0.10, percent: 10 }
            ]
        },
        promoBanner: {
            badgeText: '50₽',
            mainText: 'Скидка 50₽ на Киндер Сюрприз с фиксиками›'
        },
        userDefaults: {
            hasPlus: true,
            payWithYandexPay: true,
            location: 'Helsinki, FI',
            deliverySpeed: '15-30 мин'
        }
    };
})(); 