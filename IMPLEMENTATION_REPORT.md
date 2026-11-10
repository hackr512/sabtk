# SabTk commerce implementation report — 10 November 2026

## Overall status: Partially Implemented
The master brief is not fully completed. Existing catalog, checkout, plan payments, loyalty and referral functionality was preserved rather than rebuilt. No customer history was deleted.

## Fully Implemented & Tested in this execution
- Configurable standard delivery default of Rs. 250, separate from grocery and plan prices. A populated cart displayed Rs. 250; active-credit checkout displayed a Rs. 250 waiver.
- Controlled database order transitions, including ready for dispatch and failed delivery. Invalid direct pending-to-delivered transition rejected in rollback testing.
- Inventory screen with available stock, pending reservations, low-stock thresholds and cost-based available inventory value. Signed-in administrator added and removed one unit; both movements persisted and original stock was restored.
- Signed-in order SBT-261110-1027 placed and cancelled through the UI; reservation/release stock movements read back. It remains a cancelled verification order, not a payment or completed delivery.
- Rollback-only stock reservation, cancellation, failed-delivery release, delivered return request, approved restocking and duplicate-review rejection.
- Rollback-only authorization checks rejected customer inventory adjustment, customer return review and returning another customer's order.
- 46 unit/routing tests passed; latest preview build OK. Desktop admin screens and 390px mobile inventory verified; no document-level horizontal overflow.

## Implemented, Testing Pending / Partially Implemented
- Customer return product selection and status/history; administrator approval/rejection, reason, keep/restore credit and restocking. Database workflow tested; customer/admin UI submission-to-review roundtrip and actual consumed-credit restoration still need testing.
- Return submissions never automatically restore delivery credits; refunded consumed-credit automatic restoration disabled. Expired credits cannot be restored by the return procedure.
- Existing subscription credits, payment confirmation and snapshot system retained. Expiry no longer carries credits forward. Full renewed lifecycle and simultaneous-order stress tests were not rerun here.
- Account includes subscription countdown and optional shopping/renewal choices. Plan management preserves purchase terms; effective per-delivery price now displays exact cents. New plan creation remains missing.
- Existing loyalty/referral and coupon validation retained; full returned-order points reversal, referral configuration and coupon race/usage tests remain outstanding.
- Service-area table currently restricts zones to Islamabad/Rawalpindi; plan zone eligibility remains in the checkout transaction. Future expansion requires explicit subscription-city enforcement.

## Not Implemented / Remaining work
- Return evidence image uploads and explicit replacement dispatch workflow.
- Product refund payment recording and wallet balances/transactions/checkout usage. Return refund values remain explicitly not recorded; no fake refund success.
- Customer-specific coupons, coupon/referral administration and advanced date-filtered analytics with refund/net-revenue distinctions.
- Expiry notifications beyond account display, comprehensive subscription delivery history, plan creation and purchase statistics.
- Inventory finalization movement on delivery, historical movement backfill, cost coverage indicator (current missing cost values contribute zero, not inferred profit).
- Full cross-customer SELECT isolation tests, coupon concurrency, order request idempotency and simultaneous-order stress testing.
- Full-schema/index/function audit beyond commerce paths examined here.

## Database changes
- `0010_extended_order_statuses.sql`: additive order status values.
- `0011_commerce_pricing_inventory_guards.sql`: delivery setting reader, lifecycle changes, transition guard, inventory ledger/trigger and admin adjustment procedure.
- `0012_reviewed_return_management.sql`: return requests/items/history, read policies and ownership/admin-checked transactional procedures.
- New public tables have explicit grants and enabled RLS; only authorized readers can view inventory history, and return reads are owner/admin scoped. Return and inventory changes generate audit events.
- An initial combined migration failed due to SQL quoting and was rolled back; corrected smaller migrations applied successfully.

## Changed application areas
Pricing, cart, checkout, account, shared order statuses, admin order/settings/plan controls, customer/admin order detail, new inventory and returns pages, and authenticated commerce functions. New routes have app-specific metadata.

## Verification limitations
The shell database role cannot execute privileged checkout procedures; service-backed rollback tests exercised those operations instead. Early browser probes ran before hydration and produced blank screens/empty carts; successful reruns waited for rendered state. No new online payment provider was added; COD/manual verified plan payments remain the configured workflow.