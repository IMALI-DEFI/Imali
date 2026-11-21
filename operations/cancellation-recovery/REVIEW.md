# P0 subscription cancellation recovery — approval review

State: CODE COMPLETE; NOT DEPLOYED. Fifteen isolated tests and full prepared backend syntax pass.

The approved/deployed guard prevents partial account changes, but cancellation still returns 503 because the global Stripe client does not exist. This patch replaces only the cancellation handler with a scoped client and uses the existing configured base-plan prices.

When the authenticated owner requests cancellation, verify the linked customer, subscription and base-plan price first. For a legacy account missing a subscription ID, accept only one unambiguous owned base subscription. Ask Stripe to set cancel_at_period_end=true, and verify its response before recording local cancellation metadata. Repeated requests do not repeat an already-confirmed provider mutation.

Do not prematurely mark the account unpaid or disable trading. Paid access remains valid until Stripe's verified subscription-ended webhook applies the existing entitlement policy. No trading strategy, execution engine, watchdog or price is changed. Missing/ambiguous ownership and unsupported subscription states return a clear error without financial or local account mutation.

Provider failures leave local data unchanged. If Stripe confirms cancellation but local bookkeeping fails, report the confirmed outcome truthfully and log the bookkeeping failure; a repeated request can repair local metadata without repeating the provider change.

Tests use only fake provider/database calls. They cover ordering, paid ownership, missing configuration/account, provider failure, wrong customer/metadata, add-on rejection, legacy lookup, ambiguity, pagination, ended/incomplete subscriptions, repeated cancellation, local bookkeeping failure and malformed acknowledgments. No real subscription was cancelled or changed.

Deployment requires separate approval under the master billing instruction: it restores real customer-requested cancellations and preserves access until the paid period ends. If approved, hash-check and timestamp-backup user-api.js, apply this one route, restart only user-api, and validate read-only paid/unpaid APIs. Do not issue a live cancellation as a test.
