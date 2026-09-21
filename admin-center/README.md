# Admin and Social Media Center

The Admin landing page links directly to `/admin/social`, defaults to Needs Approval, and aggregates existing Opportunity Engine ACTION_REQUIRED counts without changing that engine. Navigation groups existing features into Overview, Social Media, Opportunity Engine, Marketing, Trading, Customers, and System.

## Existing data and lifecycle

- The former Auto Posts screen reads `/api/admin/automation/jobs` → `automation_jobs`. Its old API has hard-coded send totals, and that table was empty during audit. It is now labeled Legacy Automation Jobs.
- Existing `social_queue_v1` is the authoritative delivery queue. Its transport states are DRAFT, APPROVED, SCHEDULED, POSTING, POSTED, FAILED, RETRY.
- The preparation generator saves four DRAFT rows per product/campaign: Facebook feed, Instagram feed, Instagram Story, TikTok prompt. Its campaign-review endpoint records content approval separately and deliberately does not publish. Existing publisher guards reject these campaigns.
- The existing connection screen omitted creative/caption from its queue query. That explains why connection controls and raw status data did not provide an approval inbox.
- Marketing packages are read from the existing IMALI and Sports Jedi output directories. A selected package can be idempotently added to the same queue for manual review; this does not run a generator or publisher.
- Historical YouTube IDs/URLs come from existing output packages. The Sports Jedi Telegram success marker only establishes the latest recorded publication date; older per-post receipts and exact times are not retained. Missing times are displayed as unavailable and excluded from Published Today.
- The old `social_posts` table and `automation_jobs` had no records in the audit. Legacy Python social endpoints include sample data and a publish endpoint that merely logs success. The new center does not consume those placeholders. Scheduler success messages are not publishing receipts.

## Additive review support

`social/center.js` mounts under the existing authenticated admin router. Review decisions, edited copy, digest approval, manual planning date, manual published URL, and audit history are saved in the existing `provider_state.review_center` JSON. The immutable campaign/source snapshot remains intact. Review writes set `preparation_only=true`, retain or return transport state DRAFT, and never call a publishing transport. Optimistic revisions plus row locks reject stale writes. Editing/regenerating clears approval. Regenerate invokes the existing campaign templates over the saved source; it is not a new live-source campaign generation.

The only schema change expands the existing connection platform constraint for manual Pinterest, Telegram, and Threads records. It does not configure OAuth, change scope checks, or enable transports.

Manual scheduling is explicitly a planning date, not an automatic publisher or a push notification. No Approve & Publish control is shown because no shared-queue platform currently supports that operation under its authoritative gates. Retry is unavailable while publishing is blocked. POSTING/uncertain outcomes cannot be edited, dismissed, retried, or manually marked as published through this UI; they require external outcome reconciliation. Failed posts retain their error and can be edited, rejected, or dismissed.

## Observed platform status

- IMALI Facebook Page connection passes GET-only identity validation. Publishing remains disabled. This does not prove an external publish would succeed.
- Instagram, TikTok, X, LinkedIn, and shared YouTube destinations are disconnected/unconfigured for both brands. TikTok is prompt-only; its transport stays disabled.
- IMALI YouTube has 10 historical upload receipts. AUTO_YOUTUBE is false; present authorization is not certified by those receipts.
- Sports Jedi Telegram has an existing independent daily publisher and a retained latest success marker. Center approval does not invoke or alter it.
- Pinterest and Threads have no configured automatic publisher. Other generated platform copy is manual.

## Validation and deployment

`CI=false npm run build` passes. iPhone 390×844 and desktop 1440×1000 browser checks use captured real database-backed API responses, verify previews, editing controls, filters, navigation, attention links, no horizontal overflow, and no social write requests. Existing analytics writes are blocked during browser tests.

`tests/live-validation.js` exercises real PostgreSQL edits/approvals/rejection/regeneration/manual planning/manual receipts, revision conflicts, failure dismissal, uncertain-outcome protection, and idempotent legacy import inside an outer transaction that is rolled back. Schema validation uses the database owner inside that same rollback. It makes no external social POSTs. This is a controlled deployment validation script, not a routine production job.

The backend installer backs up the old router, checks its baseline checksum, installs only the two social files, adds the manual platform constraint, and restarts only user-api. It fingerprints 145 protected files covering Opportunity Engine code/timers, the trading executor, user-api, and existing social publisher/approval code. Post-deploy GET-only verification checks actual authenticated endpoints, rejects anonymous requests, reads an actual creative, checks publishing switches, and verifies all protected hashes remain equal. No Opportunity Engine or trading source is part of this change.
