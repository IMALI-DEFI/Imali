# Billing subscription read recovery — September 25, 2026

The real paid/unpaid API probes both returned HTTP 500. Production code and fresh logs prove `ReferenceError: stripe is not defined` at the billing subscription handler's initial guard. The Stripe SDK was imported, but no `stripe` instance existed in the module.

A read-only Stripe probe with the existing production credential succeeded: sampled unpaid customer had no subscription, sampled paid customer had an active subscription. No customer, subscription or charge was created or changed.

Only `GET /api/billing/subscription` was changed. The handler now creates a scoped client using the existing credential, with a 15-second timeout and no automatic retries. Missing optional price/items data is safe. Missing accounts return 404; absent provider configuration, malformed responses and provider errors return a generic 503. Logs retain only safe error type/status, not raw provider messages or credentials. Authentication middleware and entitlements remain unchanged.

Eight isolated route tests pass: paid, unpaid/no subscription, no customer, missing user, missing configuration, null optional data, malformed provider response and provider failure. Full backend syntax check passes. No frontend source changed; the production frontend build passed during the preceding social reliability work.

Original source: `billing-audit/backup-20260925T031600Z/user-api.js` (local label); actual production backup `/var/backups/imali-billing-read-20260925T031528Z/user-api.js`. Full-file SHA-256 guard prevented replacing any intervening production change. Only user-api restarted, PID 3905132 → 3982541.

Post-deployment real paid/unpaid API results are saved in `api-after.jsonl`; protected trading/scoring/shadow hashes and service state are in `protected-after.txt`.

Other payment-writing routes also reference the missing global Stripe client. They were deliberately left outside this read-only recovery; their end-to-end behavior remains UNVERIFIED and requires a separate controlled billing review. No payment operation was exercised or enabled by this change.

The original blank-screen customer's exact failure remains UNVERIFIED without their account/client evidence. Dashboard resilience remains deployed and independently tested.
