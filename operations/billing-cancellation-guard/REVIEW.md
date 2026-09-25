# P0 billing cancellation guard — ready for approval

State: CODE COMPLETE; syntax check and 3 isolated tests pass. NOT DEPLOYED.

Production baseline SHA-256: 366733f5d91e1ee9be7024533c86e42c3b4c6f465650dc3becc747bb79ddcdc5. Current server source matches the last verified deployment.

The cancellation route updates subscription_status to cancelling and trading_enabled to false before referencing an undefined Stripe client. It then returns an error without asking Stripe to cancel the subscription. This is a proven code path; whether customers have encountered it remains UNVERIFIED.

The five-line guard returns an explicit HTTP 503 before any local or Stripe write when the client is absent. It does not initialize Stripe, enable checkout/cancellation, change prices, or change the existing configured-client path. Authentication remains unchanged.

Deployment scope, if approved: recheck source hash; timestamp backup of user-api.js; apply only this guard; full Node syntax check; restart only user-api; verify active/new PID and read-only health checks. Do not call a live cancellation endpoint as a test.

Other blockers found, not changed:
- Several payment routes reference the missing global Stripe client.
- Subscription checkout uses stripeCustomerId although its local variable is customerId.
- SITE_ORIGIN and STRIPE_SECRET_KEY are referenced without module declarations.
- The legacy billing checkout accepts an arbitrary price and omits tier metadata.
- Global JSON parsing precedes the webhook raw-body parser, preventing the original bytes from reaching signature verification.
- Confirm-card does not verify the SetupIntent belongs to the authenticated user's Stripe customer.

Re-enabling all routes with a global client would expose these existing failures; it is not a safe standalone fix. No payment-writing route was invoked, no production files changed, and no service restarted during this work unit.
