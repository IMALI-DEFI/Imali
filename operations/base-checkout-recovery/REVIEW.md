# P0 base-plan checkout recovery — deployment review

State: CODE COMPLETE; NOT DEPLOYED. No live checkout, charge, subscription update or webhook replay was performed.

## Confirmed production failures

Pricing calls `/api/billing/create-checkout-session`. That handler references undefined `stripe`, `STRIPE_SECRET_KEY` and `SITE_ORIGIN`. The alternate subscription checkout additionally passes undefined `stripeCustomerId` instead of its local `customerId`. The configured Stripe endpoint points to `/api/stripe/webhook`, where an undefined client and earlier global JSON parsing prevent signature verification.

Read-only provider checks confirm both configured Pro/Elite prices are active recurring prices. Frontend price IDs match those exact backend IDs. No price, currency or interval is changed. A second existing Firebase checkout webhook is configured; its implementation and effects remain UNVERIFIED and are not modified.

## Prepared scope

- Reuse one authenticated, server-price-validated handler for the two existing base-plan checkout URLs; remove the broken duplicate HTTPS implementation.
- Use a client scoped to these routes, preserving the deployed cancellation guard and avoiding blanket enablement of other billing endpoints.
- Validate return URLs, account existence and the configured price before any customer creation. Reject a second checkout when a current/unsettled base subscription or paginated ambiguity exists.
- Preserve checkout's existing hosted payment behavior. Creating a checkout does not itself grant paid access or enable trading.
- Retain original JSON bytes only on the existing Stripe webhook route and verify their signature with the existing signing secret.
- Read current subscription state from Stripe. Verify the configured base-plan price and uniquely mapped customer before entitlement updates. Reject mismatched account/plan metadata; ignore service add-ons for base-plan grants.
- Apply user and API-key entitlement changes atomically. Roll back on error and return 503 so Stripe can retry. Do not let an older subscription event revoke a different current subscription.
- Preserve existing entitlement rules: active/trialing grants paid access; confirmed ended subscriptions revoke access. Do not automatically enable live trading.

## Verification

Full prepared user-api syntax check passes. 27 isolated tests pass using the installed Stripe SDK's signature generation/verification, real Express JSON middleware on a localhost-only test server, and fake Stripe transports/database calls. Tests cover both URLs, valid/invalid prices, return origins, missing accounts/configuration, existing subscriptions, provider failures, ownership, metadata, signed bytes, stale events, replay, cancellation and rollback. No live provider writes were used.

Frontend source is unchanged; its last verified production build remains applicable. Live card-setup, plan-change and add-on routes are outside this patch and remain separate P0 billing follow-ups. End-to-end real purchase and the second Firebase webhook remain UNVERIFIED; no real purchase will be manufactured to test the patch.

## Deployment, only if approved

Compare the entire production user-api against the captured post-cancellation-guard hash. Create a new timestamped production backup. Replace only the reviewed file, check syntax, restart only user-api, verify a new active PID, and rerun paid/unpaid read-only API checks. Do not invoke checkout, cancellation, payment or signed production webhook writes during validation. Watchdog, scoring, shadow and Opportunity Engine code remain untouched.

Approval requested because the master instruction requires approval before billing changes and deployments with consequential customer impact. This patch restores customer-initiated checkout and processing of signed subscription events; the earlier approval covered only the cancellation guard.
