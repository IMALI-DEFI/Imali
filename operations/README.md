# Social automation and opportunity funnel completion

This release extends the existing queue, publishers, scheduler and Opportunity Control Center. It does not create a parallel post database or change trading execution.

## Production diagnosis and fixes

- Nginx's `/api/admin/social/` override incorrectly sent requests to port 8001. The Node routes on port 3000 returned valid authenticated responses. The route was corrected and validated with the existing exact-origin CORS policy.
- A manually started Node process held port 3000 while `user-api.service` restarted repeatedly. The managed service now owns the port.
- The Facebook scheduler lacked the API service's private `LoadCredential` mount. It now receives the same root-owned credential without relaxing file permissions. A transient read-only credential probe passed; the scheduler was not invoked to test publishing.
- Connections load independently from queue history and display useful request errors. The executive overview and automation panel use live scheduler/worker status.
- Threads uses fixed destination usernames, encrypted tokens, verified OAuth identity/scopes, approved public media origins, durable create/publish markers, actual provider post IDs/permalinks, and explicit review after uncertain outcomes.
- Threads schedules cannot be enabled until the destination has confirmed OAuth and a successful controlled-test receipt. Enabling an eligible schedule starts its installed worker timer. It remains disabled at delivery because OAuth is incomplete.
- Founder is a separate `founder` destination with separate Instagram/Threads rows. Existing product keys, queue foreign keys and token encryption context remain compatible. No credential was copied between destinations.
- Generate Now uses the existing force-slot and durable slot claim, producing a review-only draft. Post Now requires content approval and a separate publish confirmation, then uses the existing publisher adapters. Expired or edited signal previews cannot be silently published.
- Configured base posting windows remain intact. NFL Monday/Thursday/Sunday and CFB Saturday receive priority when due slots coincide. Player parlays require five unique players and allowed player-prop markets; insufficient supported legs are skipped.

## Admin paths

- Admin → SOCIAL MEDIA → Social Media Center: `/admin/social`
- Connections and controlled tests: `/admin/social-connections`
- Opportunity Control Center → Funnel quality, conversion & source performance: `/admin/work-agent`

Needs Approval is the default. Tap Preview & review for the actual creative/caption, then Edit, Approve, Reject or Regenerate. Approval alone does not publish. Eligible generated previews offer Post Now with confirmation; manual posts retain Copy caption, creative/destination links and a manual publication receipt.

Existing top-level groups are Overview, Social Media, Opportunity Engine, Marketing, Trading, Customers and System. Attention links use actual backend action counts.

## Data and lifecycle

The old auto-post display read `social_queue_v1` and marketing output packages under IMALI and Sports Jedi marketing directories. Legacy YouTube upload receipts and the independent Sports Jedi Telegram marker supply historical evidence. The legacy `social_posts` table is not a second approval queue.

The transport queue uses DRAFT → APPROVED/SCHEDULED → POSTING → POSTED, with FAILED/RETRY where supported. The review center stores editorial decisions in existing `provider_state.review_center`. Prepared campaigns stay protected from legacy publishers. An uncertain Threads request enters REVIEW with `CONFIRMATION_UNKNOWN_DO_NOT_RETRY`; it is never blindly recreated or published again.

## Opportunity work

The new read-only funnel separates discovered, qualified, pursuit, human review, ready, approved, recorded sent/applied, replies, interviews, proposals, wins, losses and realized revenue. It includes source/category performance, observed conversion overlaps, duplicates, stale/expired records, missing contact paths, overdue follow-ups, acceptance/rejection reasons and ranked next actions.

Bounded discovery reuses the existing fit/demand thresholds, suppresses duplicate or expired new candidates, and allocates source effort using downstream actionable quality with retained exploration. RemoteOK now preserves source-provided application URLs and posting dates as unverified evidence. The existing qualification, procurement, pursuit, application, outreach, provider, follow-up, disposal, Human Attention and submission safety engines remain authoritative. No external submission was enabled.

Controlled discovery comparison (same reporting definitions, shared engine lock):

| Metric | Before | After discovery |
|---|---:|---:|
| Discovered | 4,951 | 4,952 |
| Qualified | 1,240 (25.05%) | 1,241 (25.06%) |
| Actionable | 924 (18.66%) | 924 (18.66%) |
| Duplicate candidates in existing records | 156 (3.15%) | 156 (3.15%) |
| Stale/expired | 1,441 (29.11%) | 1,441 (29.10%) |
| Missing contact/application path | 495 (10.00%) | 496 (10.02%) |
| Ready for human action | 340 | 340 |
| Recorded sent/applied | 27 | 27 |
| Replies / wins / realized revenue | 0 / 0 / $0 | 0 / 0 / $0 |

The cycle made one read request, saved one qualifying RemoteOK lead, rejected 18 below the existing threshold and skipped 80 duplicates. Its missing source application URL/date were subsequently backfilled from the actual source response without marking them verified. No claim of conversion or revenue improvement is justified yet. The estimated $4,231,020 pipeline is explicitly unverified, not revenue. Twenty-seven overdue follow-up timestamps are exposed for review, not automatically sent.

## Validation

- Backend JavaScript syntax and Python compilation passed.
- Seven social safety tests and six funnel/discovery tests passed.
- PostgreSQL migration, founder isolation, Threads gating and idempotent preview integration checks passed in a rolled-back transaction.
- Mounted API route checks passed with actual database reads; missing publish confirmation was rejected.
- Ten authenticated public API endpoints returned 200 with the required CORS origin.
- `CI=false npm run build` passed.
- iPhone 390×844 and desktop 1440×1000 checks used captured production API responses, with every non-GET request blocked. Approval editing, new destinations, live status, funnel UI and overview attention links passed without horizontal overflow.
- 128 protected production files, including the existing state machine, safety engines, user API/CORS file and Instagram/Facebook workers, matched their predeployment hashes. The explicitly authorized discovery adapter and RemoteOK connector were changed; trading behavior was not.
- No external social test post or opportunity submission was sent.

## Remaining authorization

IMALI Instagram and Sports Jedi Instagram have confirmed publishing receipts and active automation. IMALI Facebook has a verified Page identity and enabled configuration; its scheduler credential fault was repaired without sending a test post, so a new scheduled publication receipt is still pending verification.

IMALI, Sports Jedi and founder Threads require their own Meta OAuth, destination confirmation and controlled test. Founder Instagram requires its OAuth app setup/consent. Sports Jedi Facebook requires authorization for its own Page and remains disabled. Two historical IMALI Instagram outcomes have no retained provider IDs and require reconciliation before any retry.

Other platforms are not enabled by this release. Existing manual TikTok, Pinterest, X and LinkedIn workflows and legacy YouTube/Telegram history remain visible.

## Deployment record

All production modifications were backed up under `/var/backups/imali-*` before replacement. Deployment scripts are hash-guarded historical release tools; a changed production file requires a fresh reviewed manifest, not bypassing the guard. The destination migration is transactional. Restore SELinux labels for new files; never disable SELinux.

The source snapshot in `operations/` is the final deployed backend/engine code. Initial and follow-up manifests record staged deployment history. Tokens, configs, vault material, environment files and live opportunity records are deliberately absent.

Threads endpoint references: Meta's official [post details](https://www.postman.com/meta/threads/request/34203612-416ad6d2-214e-415a-bfe4-98c959fe25ad) and [token debugging](https://www.postman.com/meta/threads/request/mm48yqc/debug-access-token) documentation.
