# IMALI Opportunity Engine operating layer

This additive layer preserves detailed opportunity statuses and historical outcomes. The admin dashboard reads global PostgreSQL aggregates and uses the same predicates for drilldowns.

Operational precedence: recorded external outcome → audited disposition → eligible safe preparation → genuine human decision → evidenced external dependency. Every active machine record has a named action and retry time. Procurement qualification requires official scope and explicit eligibility evidence. A generated draft is not a final bid. Provider evidence is not a hire. Recovery remains compliance locked.

Production requires the existing engines in `/home/opc/imali-work-agent` and the authenticated admin route in `/home/opc/imali-sniper/routes`. Mount `opportunity-engine.js` at `/engine` using the existing admin route's PostgreSQL pool, after the existing authentication/administrator middleware.

Before migration, back up all opportunity and dependent tables and verify the dump with `pg_restore --list`. Apply `migrations/001-operating-layer.sql`, install the `work` files alongside the existing engines, run `opportunity_store.py`, then validate every aggregate against its drilldown. The migration adds operating-state, research, provider-candidate, cycle, retry, and transition-audit tables. Existing contractor matches are copied as unverified candidates; none are hired or approved.

The fast and slow wrappers share `/tmp/imali-opportunity-autopilot.lock`; the dispatcher adds an advisory lock. Preserve existing systemd CPU quotas (35% fast / 25% slow), Nice=15 and idle I/O. Fast cadence is 15 minutes after completion; slow cadence is six hours. Legacy heavyweight work-agent/work-pipeline timers remain disabled. The old agency-mode and contractor-lane timers are disabled because their preparation is dispatched under the shared lock and its RFQ sender must not run autonomously.

Required switches: `OUTREACH_SEND_ENABLED=false`, `RFQ_SEND_LIVE=0`, `APPLICATION_AUTO_SUBMIT=false`. Email and follow-up services/timers stay masked. The dispatcher has a preparation-only allowlist; no sender, application executor, final competition submission, or recovery claimant contact is exposed. Approve, edit, reject/dispose, and restore are auditable admin actions; approval never sends.

Public research has time, request, response-size and redirect restrictions. Official JavaScript procurement portals receive one bounded read-only browser attempt. Incomplete public metadata remains unqualified. Provider inventory placeholders cannot become verified providers. Machine output is untrusted evidence, not legal permission or a commitment.

Run `python -m unittest discover -s tests`; the optional private production-snapshot test requires a locally held `audit/opportunities.jsonl` and is not shipped with customer records. Run Python compilation, bash syntax, Node syntax, frontend `CI=false npm run build`, aggregate/drilldown consistency tests, rollback-only decision tests, and a resource-guarded controlled cycle. Compare all external-result counters before resuming the two timers.

Rollback: stop opportunity timers, restore backed-up scripts/routes, restart only the user API if needed, and keep the additive tables for audit. Do not reset sent/submitted/won/revenue fields or delete trading data, research artifacts, or browser caches.
