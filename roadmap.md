# SabTk Storefront Roadmap

## Current request
- [x] Upgrade existing ledger for first-order reservations, automatic paid credits, cancellation and payment lifecycle.
- [x] Show customer usage, admin filters and per-order credit history; 29 unit tests, rollback-only lifecycle checks, signed-in order/cancellation, admin ledger and mobile checkout verified. Simultaneous-order stress test not exercised; existing per-user transaction lock retained.
- [x] Remove subtotal-based free-delivery messaging and enforce Rs. 150 delivery on all grocery subtotals, preserving paid plan credits; verified signed-in order and cancelled test.
- [x] Add optional cart/checkout delivery-plan selection and persistent order snapshots.
- [x] Show delivery-plan filters and details in admin orders.
- [x] Test pricing, plan changes/removal, and signed-in order roundtrip.
- [x] Add configurable GharBudget consumption rules and quality mappings.
- [x] Build and test budget-constrained server recommendations (24 tests pass).
- [x] Upgrade customer setup, customization, saved budgets and cart handoff; public generation/cart and budget changes verified.
- [x] Add admin GharBudget product, consumption and category controls.
- [ ] Verify signed-in admin edits and account-saved budget roundtrip — blocked: requesting user has no matching auth account; preview sign-in required.
- [ ] Owner review of initial consumption estimates and explicit quality mappings — starter values supplied, some essentials shared across tiers; Daal Mash and coriander unavailable in catalogue.

## Earlier implementation checklist (historical, outside this presentation request)

- [ ] Backend: catalogue, delivery zones/windows, orders, loyalty, referrals, ration bundles, GharBudget, support
- [ ] Design system (lime / deep green / purple), header, mobile bottom nav, footer
- [ ] Home page (hero, categories, essentials, bundles, GharBudget, offers, loyalty)
- [ ] Shop (search, filters, sort, pagination), categories page, product detail
- [ ] Cart + checkout (server-validated order placement, COD)
- [ ] Monthly Ration, GharBudget, Offers, Rewards pages
- [ ] Account: profile/addresses, orders + tracking, saved, plans, rewards/referral, notifications, support
- [ ] Footer/trust pages: about, contact, delivery, FAQ, policies, privacy, terms
- [ ] Pricing/delivery/points rule tests
- [ ] Open: real catalogue, prices, delivery areas, contact details, digital payments (needs owner input)
