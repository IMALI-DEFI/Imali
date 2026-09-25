# Social publishing reliability — September 25, 2026

## Verified delivery

Read-only platform API lookups returned the exact saved post IDs and permalinks for all 45 Facebook/Instagram receipts: IMALI Facebook 9 (all `is_published=true`), IMALI Instagram 14, Sports Jedi Instagram 22. Identity reads confirmed the correct IMALI Page and the separate Instagram usernames. This verifies platform objects, not merely worker execution or HTTP success. No publishing endpoint was invoked by this audit.

The September 24 scheduled runs produced 9 Facebook and 9 Instagram IMALI posts; one stock slot on each platform properly skipped `NO_UNUSED_QUALIFIED_STOCK`. Sports Jedi produced 10 Instagram posts; one attempt remains under review. Scheduled signals remain qualified under the existing rules. No strategy or qualification changes were made.

Sports Jedi Telegram's public channel displayed messages 22–41. Each matched exactly one saved campaign by full caption and date. Twenty exact campaign receipts were restored with real message ID, permalink, platform time and evidence type. Most recent: https://t.me/sportsjedi/41 (2026-09-24 15:00:03 UTC).

## Actual failures and fixes

- The earlier Facebook scheduler credential fix is now proven by nine naturally occurring posts, each read back from the correct Page. No further credential or publishing flag change was needed.
- Threads for IMALI, Sports Jedi and founder remains disconnected: application configuration exists, but no authorized account/token or successful readiness receipt. Worker timer is disabled. This is the missing prerequisite, not a shared Instagram/Facebook delivery outage.
- Sports Jedi Facebook has no configured Page authorization and stays disabled. IMALI credentials are never reused for that brand.
- Admin compared database Date objects alphabetically and displayed older “last success” receipts. Numeric timestamp ordering now handles dates correctly.
- Telegram's daily marker incorrectly labeled every same-day generated campaign published. Only campaign-specific receipts now qualify as published.
- The Telegram publisher now retains its acknowledged message ID, URL and timestamp in the existing output tree. It snapshots the package used for caption/image/receipt consistency. The existing daily anti-duplicate marker is persisted before receipt processing so a receipt-write failure does not cause an acknowledged post to be retried.
- Published queue cards now identify their recorded automatic/manual method instead of telling the administrator to manually publish them again.

## Uncertain Instagram attempts

All three remain held; none was retried or falsely marked published.

- `b5177d9c-c784-460e-8022-149e89e4cac6`: no retained container/media ID; no exact caption match in the complete current account feed. Historical outcome UNVERIFIED (absence now cannot exclude deletion).
- `6c23e497-3d7a-4997-92e3-78547fb8c8d8`: matching live media `18412297999152231` already belongs to successful queue job `0f255245-92cc-4e77-9d9c-1a691cc0db3d`. Assigning it again would double-count delivery. Original attempt UNVERIFIED; do not duplicate.
- `b99909fb-8069-4bab-a06e-d935ad4e458f`: retained container `17935444860385882` reads `FINISHED`, not `PUBLISHED`; no matching live caption. Container is processed but publication is not confirmed. Original transport failure details were not retained; no blind retry.

## Platform matrix

| Product/channel | Current evidence/status |
|---|---|
| IMALI Facebook | Enabled; correct Page; 9 posts read back and published |
| IMALI Instagram | Connected; 14 saved posts read back; 2 historical held attempts |
| Sports Jedi Instagram | Connected; 22 saved posts read back; 1 held attempt |
| Sports Jedi Telegram | Daily publisher active; 20 public posts reconciled; latest Sep 24 |
| IMALI/Sports Jedi Threads | Application configured, OAuth disconnected; publishing disabled |
| Sports Jedi Facebook | Not configured; disabled |
| IMALI YouTube | 10 legacy upload IDs; automatic uploader disabled; current visibility/auth UNVERIFIED |
| X, LinkedIn, TikTok, Pinterest | No confirmed automatic production connection; manual/not configured |
| Founder Instagram/Threads | Instagram unconfigured; Threads app configured but disconnected |

Instagram stored expiration is null: current tokens worked for reads, but future expiry is UNVERIFIED. Existing recorded publish scopes are present. Facebook identity and post reads succeed; exact expiry/complete token permissions were not independently enumerated.

## Deployment and validation

Source changes: `operations/social/center.js`, `operations/sports-jedi/publish_daily.sh`; regression tests in `operations/tests/publishing-reliability.test.js`.

Local originals: `reliability-audit/backup-20260925T014500Z/`.
Production originals: `/var/backups/imali-social-reliability-20260925T014704Z/`.
Production source hashes checked against original files before replacement. No existing work was discarded.

10 backend safety/regression tests pass, including Date ordering, per-campaign Telegram attribution, receipt validation and existing worker duplicate prevention. Node syntax and Bash syntax pass. `CI=false npm run build` passes with existing warnings; generated frontend files are unchanged.

Only user-api restarted: PID 3401433 → 3905132. Ten real database-backed Admin/API endpoints return 200. Latest snapshot: 12 needs approval, 1 approved, 0 scheduled, 75 recorded published, 3 failed/held; 29 published September 24 New York time. The 75 includes 10 legacy YouTube receipts not newly platform-verified.

Trading PID 3510121 and shadow PID 2116407 stayed active. Watchdog/scoring/shadow hashes and 128 protected Opportunity Engine files remain unchanged. Disk remains 79%. Old `imali-work-agent.service` failure dates to September 15; current Opportunity Autopilot timer is active.

Existing desktop/iPhone Social Center tests were already complete. A fresh local browser check with post-fix production responses stalled during navigation; fresh visual verification is incomplete and is not claimed as passed. No frontend layout was changed.

No public test content, trade, OAuth grant, new publishing enablement or forced production scheduling occurred. Future natural Telegram receipt persistence has not yet run; its isolated test passes.

## Next work

Dashboard resilience and its empty-identity follow-up are deployed (PRs 9/10). The original user's exact cause remains UNVERIFIED. Resume diagnosis of the existing `/api/billing/subscription` HTTP 500 found during real paid/unpaid account checks. OAuth completion and any controlled public test remain user-dependent; new marketing features and shadow strategy promotion remain lower priority.
