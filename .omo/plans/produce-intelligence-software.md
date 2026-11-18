# produce-intelligence-software - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**Who this is for and what changes for them:** Foodservice operators get a working application for receiving produce, managing quality and inventory, preparing ingredient-aware recipes, and tracing branded orders. Administrators retain control over private data, permissions, holds and recovery.

**What you'll get:** A complete local browser application with persistent records, operator screens, recipe licensing, reporting, a device simulator and automated tests. A Windows launcher and operating instructions make it usable without a cloud account.

**Why this approach:** A single modular application keeps stock, approvals and production transactions coherent. Separate operational and simulation storage supports realistic testing without presenting simulated equipment or recipes as validated results.

**What it will NOT do:** Purchase equipment, deploy publicly, process live payments, connect unspecified hardware, or claim proven taste improvement. Those commitments require separate contracts and evidence.

**Effort:** XL
<!-- Effort is exactly ONE band, never hours/days. Quick = single edit, minutes of agent work; Short = one focused change, a few files; Medium = multi-file feature in one session; Large = several waves, one long session; XL = multi-session or architectural work. A written duration is rewritten to a band. -->
**Risk:** High - inventory, private recipe rights and production authorization must remain consistent across late events, holds and recovery.
**Decisions to sanity-check:** Local browser application; TypeScript/React/Bun/SQLite; explicit device simulator; five concurrent sessions with one thousand lots and ten thousand observations.

Your next move: Review the completed plan and its review result, then explicitly start implementation when ready. Full execution detail follows below.

---

> TL;DR (machine): XL effort; High risk; 24 implementation tasks, 4 final verifiers, complete local application and explicit physical-validation boundaries.

## Scope
### Affected user and ideal state
<!-- From the draft ledger: who this touches and how they use the result, then one IS row per property with its reason, then one GAP row per difference with its reason. Every todo below closes a GAP row; ## Success criteria proves every IS row. -->
**Affected user:** Foodservice teams receiving tomatoes, supervising sorting, producing sauces, managing private/licensed recipes and tracing branded orders. Administrators and accountable safety staff need independent control over access, holds, audit and recovery. Today only the PRD exists; the result is a working local application.

| Row | Statement | Reason |
| --- | --- | --- |
| IS-1 | Operators authenticate to an isolated organization with role-appropriate actions | Protect private records and approvals |
| IS-2 | Quality staff manage traceable evidence and explainable versioned classifications | Separate measured facts, predictions and uncertainty |
| IS-3 | Operators reconcile physical outcomes, quantities and lot lineage | Prevent duplicate movements and hidden losses |
| IS-4 | Chefs approve bounded adaptations and kitchen workers execute immutable instructions | Preserve recipe reproducibility and actual production evidence |
| IS-5 | Owners enforce recipe rights and see commercial/operating metrics | Make the offering auditable and economically observable |
| IS-6 | Delivery teams trace orders, arrival conditions and withdrawals to inputs | Preserve brand quality through consumption |
| IS-7 | Administrators and safety owners control audit, disposition, export and recovery | Quality approval cannot override holds or privacy controls |
| IS-8 | Device clients receive stable retry/conflict responses and visible admission outcomes | Integrations must distinguish recorded facts from authorization and avoid duplicate actuation |
| GAP-1 | No application, database, authentication or screens exist | Deliver real persistent workflows rather than a static dashboard |
| GAP-2 | Software workload, distribution and stack required decisions | Resolved: local browser app, TypeScript/React/Bun/SQLite, 5 sessions/1,000 lots/10,000 observations |
| GAP-3 | No hardware/provider contracts or equipment are supplied | Resolved first-build boundary: documented interfaces and a labeled simulator |
| GAP-4 | PRD lacks executable domain/API/state contracts | Define those contracts and tests below |
| GAP-5 | No trained model, validated recipe or physical trial evidence exists | Build policy/evidence workflows without fabricating validated outputs |

### Must have
- Implement every numbered PRD requirement, plus export/deletion, evidence retention and economics obligations in PRD Sections 7 and 9-15. Preserve the full six-component vision.
- Local browser application on Windows, backend bound to `127.0.0.1`, persistent SQLite and private evidence files. No cloud account, Docker or external service is required to run.
- Approved stack: TypeScript, React, Bun and SQLite. Use Bun's native server, HTML bundling, SQLite, hashing/password and test capabilities. React/React DOM and their types are the UI dependencies; TypeScript and Bun types are development dependencies. Do not add an ORM, server framework, CSS framework or global state package.
- Commit exact dependency versions in `bun.lock`; do not select speculative version numbers from this plan. At execution, resolve mutually compatible stable React/React DOM versions and pin the installed Bun version in `package.json` and README.
- Six business modules with role-appropriate forms and tables, not decorative metrics. Real create/edit/approve/hold/reconcile workflows must survive browser refresh and server restart.
- A deterministic device simulator uses the same authenticated ingest contract as devices, and exercises missing data, duplicated/late events, faults and disconnects. Simulation provenance remains visible and cannot satisfy live evidence gates.
- Classification and recipe adaptation are configurable, versioned policy execution with explicit bounds. No learned chemistry/taste model is invented.
- Supported software workload: 5 concurrent sessions, 1,000 lots, 10,000 observations. The load test uses this declared synthetic dataset and records measured latency.
- Domain/authorization TDD, transactional API integration tests, persistent restart/restore tests, browser walkthroughs, and desktop/mobile screenshot inspection.
- Program and tests support isolated temporary data directories. Normal start never overwrites an existing database or silently seeds business data.

### Source references and fixed layout

Primary specification: `.omo/drafts/produce-quality-prd-document.md` Sections 1-16. Approved software decisions: `.omo/drafts/produce-intelligence-software.md`, Decisions and Approval gate. Existing `.omo/plans/produce-quality-prd.md` is a documentation plan, not an implementation dependency.

Use this layout:

```text
package.json, bun.lock, tsconfig.json, bunfig.toml, .gitignore, README.md, start.cmd
src/server.ts
src/server/app.ts, config.ts, db.ts, auth.ts, audit.ts, evidence.ts, http.ts
src/server/migrations/001-foundation.ts
src/server/modules/{intake,observations,quality,inventory,routing,recipes,production,licenses,fulfillment,evaluations,governance}.ts
src/shared/{contracts,permissions,units,states}.ts
src/web/{index.html,main.tsx,App.tsx,styles.css,api.ts}
src/web/components/{Shell,Table,FormField,StatusBadge,ErrorState,ConfirmDialog}.tsx
src/web/pages/{Setup,Login,Overview,Lots,Measurements,Quality,Inventory,Routing,Recipes,Production,Licenses,Orders,Analytics,Administration}.tsx
src/simulator/{device,scenarios}.ts
scripts/{setup,seed-demo,backup,restore,load-test}.ts
tests/{foundation,auth,evidence,intake,observations,quality,inventory,routing,recipes,adaptation,production,licenses,fulfillment,evaluations,governance,integration}.test.ts
docs/{device-contract,operations,requirements}.md
```

`APP_DATA_DIR` defaults to `./data`, containing `app.sqlite`, `evidence/` and `backups/`; all are excluded from version control. `createApp({dataDir, clock})` returns `{fetch, close}` without binding a port. Only `src/server.ts` opens the HTTP listener. Tests create a fresh application/data directory and use its real HTTP handler. Inject clock at the boundary for deterministic expiry tests; do not mock the domain or database. The migration module exports its SQL text so production compilation embeds it without a runtime source-tree dependency.

### Shared transport and authorization contract

- JSON APIs live at `/api/v1`. Success: `{data, nextCursor?}`. Failure: `{error:{code,message,fields?}}`. Statuses: 400 invalid input, 401 no session, 403 forbidden action, 404 absent or other-tenant resource, 409 stale revision/state/idempotency conflict, 422 unmet domain constraint, 413 upload too large.
- IDs are server-generated UUIDs; times are UTC ISO strings. Lists accept `limit` 1..100 (default 25), opaque cursor, and documented module filters. Every query and relationship lookup includes the current organization.
- Mutations to existing records carry `expectedRevision`; updates atomically increment `revision`. Updates with stale revisions never silently overwrite. Append-only events use a request/event id and a canonical body hash. Same id/same body returns the original result; same id/different body returns 409. These effects and audit rows commit in one SQLite transaction.
- Sessions use random opaque tokens, hashed at rest, HttpOnly SameSite=Strict cookies, 30-minute idle and 8-hour absolute expiry, rotation on login and invalidation on logout/password change/account disable. Recheck membership and current permissions on every request. Reject non-loopback Host/Origin, cross-origin mutations and credentials in URLs. Use secure cookies only when HTTPS is configured; localhost HTTP is documented development/local transport, not a remote deployment security claim.
- First-run setup creates one organization and owner only if no user exists, with no shipped password. Owner creates additional organizations and memberships explicitly; a request chooses a current organization only among its memberships. Tests may create a second organization directly through supported admin setup flows.
- Passwords: at least 12 characters; `Bun.password` hash/verify; bounded login attempts (10 failures per account/IP in 15 minutes), generic login error, no password/hash/token in audit or logs.
- Roles are `owner`, `quality`, `robotics`, `chef`, `kitchen`, `commercial`, `delivery`, `safety`, `viewer`; users can hold multiple. Owner manages accounts/configuration but needs the safety role to exercise safety disposition. Viewer reads permitted operational summaries, never private recipe contents by default. The first bootstrap account also has a separate platform-admin flag for platform-authored catalog/entitlement administration; organization owners cannot grant this flag. Platform administration does not grant access to private tenant recipes. Permission checks run on the server; UI hiding is supplementary.
- Quality approves calibration/specification/classification; robotics commands/reconciles routing; chef versions/approves recipes and adaptations; kitchen executes approved production; commercial manages licenses/usage; delivery manages order/dispatch events; safety places/releases safety holds; owner manages retention/backup. All permitted users can report a safety concern, which places a hold; only safety can release it with a reason.
- Device credentials are separately issued, hashed and scoped to one organization and device. They admit only telemetry for that device; no device credential grants an operator API session.

### Persistence and domain contract

SQLite uses foreign keys, WAL and synchronous FULL. Migration versioning is monotonic and transactional. Never run awaited work inside a `bun:sqlite` transaction. Resolve uploads/password hashing before transactions; commit database effects and audit atomically. All tenant-owned tables include `org_id`, `id`, `created_at`, `revision`; use composite tenant/entity foreign keys and indexes for tenant/time/status queries.

Audit records include tenant, human/device actor, exercised role, action, target/version, reason, server time and event/request identity. APIs cannot edit/delete audit records. Rejected security actions append separate redacted security events; do not log private recipe content. Immutability is enforced by this application, not claimed against an operating-system owner editing the database.

Create explicit relational tables for organizations, users, memberships, sessions, devices, calibrations, models, suppliers, lots, samples, observations, specifications, specification_versions, quality_decisions, holds, locations, inventory_events, reservations, lot_edges, routing_commands, integration_events, recipes, recipe_versions, adaptations, production_batches, production_inputs, production_events, licenses, permissions, usage_events, products, product_versions, orders, order_allocations, packages, delivery_events, complaints, withdrawals, evaluations, costs, evidence_files, approvals and audit_events. Versioned policy bodies and event payloads use validated JSON, not a catch-all replacement for relational identity or stock.

Platform-authored catalog uses separate `catalog_recipes` and immutable `catalog_recipe_versions`. Only platform-admin authors/publishes these; never copy a private tenant recipe automatically. A license belongs to its recipient organization and references a catalog version through an explicit catalog FK. Recipe references are the tagged union `{kind:"private",id,version}` or `{kind:"catalog",id,version}`; private references require same-tenant FK, catalog references require an entitlement check. This is the sole intentional shared-content path and must not weaken ordinary tenant joins.

- **Observation:** attribute enum `ssc_brix|sugar|ph|titratable_acidity|mass|dimension|color|firmness|ripeness`; value is numeric or a declared categorical/color value. Include unit, basis, method, sample/item/lot scope, observedAt, receivedAt, device/operator, calibration/model version, uncertainty `{kind,lower,upper,confidence?}`, evidence refs, origin `instrument|operator|model|simulation`, and usability `valid|missing|invalid|expired|outside_validated_domain`. Missing values are null. Preserve SSC versus sugar and pH versus TA. Model estimates require model identity/version and domain; the app does not create a learned model.
- **Specs:** immutable versions define intended use, commodity/domain predicates, required attributes, accepted units/bases, maximum age, and allowed intervals/categories. Interval conformity requires the whole applicable uncertainty interval to fit. Missing uncertainty for a decisive quantitative attribute yields review. Classification returns `suitable|unsuitable|review`, attribute reasons, input snapshot/version refs and origin. A lot-sample decision stays sample-scoped.
- **Monitoring/rollback:** imported model versions declare their operating domain and an approved monitoring policy with maximum absolute paired-reference error, minimum interval coverage and maximum evaluation age. Evaluation ingestion computes error/coverage from linked predictions and reference observations; a failed frozen policy suspends that version and identifies affected inputs. Domain violations require review immediately. Activating a previous approved spec/model version changes an audited active pointer, never history or holds; recipe rollback creates an approved new version from the prior content with its origin preserved.
- **Holds:** reasons `safety|identity|quality|equipment|withdrawal|reconciliation`; independent of culinary suitability. Hold lineage applies through splits/blends and consumed-batch/order ancestry. No classification/override clears another hold. Expired calibration or suspended spec/model blocks dependent new releases; historic facts remain unchanged.
- **Inventory:** integer milligrams internally; display grams/kilograms. Count-based items carry a count and cannot convert to mass without an explicit recorded conversion. Ledger kinds `receive|sample_destroy|transfer|damage|dispose|reserve|unreserve|consume|adjust`; reserve/unreserve affects availability, not physical mass. Never allow negative on-hand or available mass. Adjustments require reason and physical reconciliation evidence.
- **Lineage:** split allocates parent mass to children, blend consumes specified source quantities into a child, all in one transaction. Sum input/output masses must reconcile; declared processing loss gets its own event. No ancestry cycles; constraints follow inputs. Forward/reverse traversal must work through sauces and order allocations.
- **Routing:** states `queued|acknowledged|confirmed|failed|uncertain|reconciled`. Only confirmed physical outcome or authorized reconciliation commits a stock movement once. An acknowledgement never moves stock. Do not resend an uncertain actuation. Late confirmed outcomes are recorded once even if a new hold exists; the hold remains and release is blocked.
- **Recipes:** immutable draft/approved/retired versions include owner/license, ingredient masses, steps, equipment, servings/yield, targets, allergen/process constraints, validated-domain declaration and simulation flag. Retiring a version blocks new approvals but retains historic access.
- **Adaptation:** policies select decisive observations and bounded linear adjustments: each rule names one attribute/reference, target ingredient mass or step time/temperature, slope and allowed input/output range. Combine declared deltas deterministically, validate every output against bounds, then round once to explicit units/precision; never silently clamp infeasible results. A rule may not add ingredients or alter allergens. Missing evidence, unknown basis, uncertain/out-of-domain decisive inputs or infeasible output returns `unavailable` with reasons. No universal sugar/acid flavor formula is supplied. Example policies are marked simulation-only.
- **Adaptation approval and execution:** immutable snapshot includes inventory revision/reservation, observations, policy/spec/recipe versions and rights. At approval, reserve sufficient eligible input; reservations have no automatic expiry and require consumption or explicit cancellation/release. Before production starts, recheck eligibility, current holds, rights and snapshot inside the committing transaction. Stale snapshots require regeneration/review. Started work may record actual outcomes/deviations and read only its pinned instructions through batch-role permissions after rights change, without catalog, cloning, export or new execution access.
- **Production:** `planned|approved|in_progress|completed|held|cancelled`; record actual inputs, step facts, deviations, yield, finished observations and sensory assessments. Consumption and batch completion update ledger and production atomically. No unapproved substitution or bypass of safety/process limits.
- **Licensing:** operator-owned recipes are private; platform recipes have version-specific entitlements, start/expiry/revocation, allowed organizations and permitted uses. Publication, derivatives, export and training are separate explicit grants defaulting false. One successful production start produces exactly one usage event keyed by `(org_id,batch_id,production_start)`; retries cannot duplicate usage. Disputes/adjustments append records. Invoice/usage records are local, with no external payment action.
- **Orders:** `draft|allocated|ready|dispatched|delivered|held|cancelled`; allocate finished production quantities, attach immutable product/packaging version and required condition fields. Readiness/dispatch/delivery enforce configured conditions and current holds. Delivery exception is recorded even if unacceptable; it cannot be mislabeled accepted.
- **Withdrawal:** mark impacted input, traverse descendant stock/batches/orders, hold eligible material, expose an action list and corrective records; no automatic messaging or remote cancellation.
- **Lifecycle:** supersede observations/decisions rather than overwrite. Personal account deletion disables sessions and pseudonymizes personal fields; referenced production/rights/audit evidence remains under an explicit retention hold. Unreferenced permitted business data can be deleted only after dependency preview and reason. Export returns authorized machine-readable records plus a manifest, excluding credentials and unlicensed content. Live-personal-data activation requires an explicitly approved retention policy; synthetic test data needs no live-data claim. Maintain deletion instructions that can be reapplied after restoring older snapshots before data access is reenabled.
- **Backup/restore:** make a consistent SQLite snapshot and copy its referenced evidence under a checksum manifest; incomplete snapshots cannot restore. Restore into a separate directory, verify integrity/manifest, invalidate sessions and device credentials, reapply deletion instructions, and set a recovery hold before enabling operational mutations. Never overwrite active storage through an HTTP restore button. The CLI requires the server stopped and an explicit new output directory. Default local backups are owner-only, opt-in snapshots retained until explicit deletion; do not promise encryption against an OS owner.

Backup snapshot creation uses SQLite's online-consistent snapshot mechanism (`VACUUM INTO` a new file) while the application holds its backup maintenance gate against mutations; preserve all evidence referenced by that snapshot. Keep a deletion-instruction journal outside individual snapshots in the control directory. Restore requires the latest journal supplied by the operator/agent, replays it before any user access, invalidates human/device sessions, and boots into owner recovery setup plus a recovery hold. If the journal is unavailable, do not unlock restored records. Snapshot files are never treated as the only source of later deletion instructions.

### Device contract and simulator

`POST /api/v1/device-events` takes `{eventId,schemaVersion:1,deviceId,occurredAt,kind,subjectId,correlationId,payload}` under a device bearer credential. Kinds: `observation`, `routing_ack`, `routing_outcome`, `fault`, `heartbeat`. Preserve received time; invalid/oversized events fail before effects. Outcome payload includes commandId, materialId, source/destination and `confirmed|failed|unknown`; subject and tenant must match the command.

The simulator is a separate CLI using this real endpoint and a credential explicitly issued to a simulation device. Scenarios `happy`, `duplicate`, `late`, `disconnect`, `identity-loss`, `fault`, `stale-calibration` are repeatable. A run does not silently clear holds. Use separate immutable `APP_MODE=operational|simulation` instances and separate data/evidence directories; normal server port 3000 and optional demo instance port 3001. Simulation credentials/events are denied by operational storage, and operational credentials are denied by simulation storage. Records also carry origin for propagation into exports and derived reports. Operational start does not seed records or approve policies; `bun run demo` explicitly creates simulation fixtures only in the demo directory. No simulator result satisfies a physical commissioning or scientific gate. No driver for unspecified real equipment is claimed complete.

### User interface contract

Desktop: persistent left navigation, page title/action, status summary and working tables/detail forms. Mobile: compact navigation drawer, stacked labeled fields and scrollable tables with reachable primary actions. Use semantic HTML, keyboard focus, accessible labels/errors, readable units and status text in addition to color. System light/dark themes; preserve contrast in each. Use restrained green/neutral styling suited to produce operations, no decorative charts with invented data.

Pages: Overview, Lots, Measurements, Quality, Inventory, Routing, Recipes, Production, Licenses, Orders, Analytics, Administration, plus Setup/Login. Every page handles initial loading, empty state, form validation, server error and stale revision conflict. Overview/analytics use real queries and a clear empty state; seed data is optional, labeled and never automatic. Detail screens cross-link lot -> evidence -> routing/stock -> recipe/production -> order/withdrawal.

Use hash navigation (`/#/lots`, `/#/lots/:id`, corresponding named pages) to support refreshable deep links without a router dependency or server-side rendering. Keep selection/filter state in the URL where applicable.

Filters include date/status/search where appropriate; list pages use server pagination. Confirm safety release, destructive lifecycle actions, license revocation and restore actions with a reason. Authorization errors must not expose other-tenant entity names. Do not store credentials/private recipe bodies in localStorage.
### Must NOT have (guardrails, anti-slop, scope boundaries)
- No static-only demo, hardcoded dashboard metrics, successful no-op controls or unpersisted CRUD.
- No actual hardware claim, autonomous equipment replay, fabricated trained models or taste improvement results.
- No remote deployment, paid account, payment transfer, consumer messaging, courier booking or procurement.
- No change to the accepted foodservice/tomato/private-recipe direction, and no public creator marketplace.
- No git commit without explicit authorization; preserve all existing `.omo/` artifacts.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD for domain/authorization invariants, with tests delivered alongside every feature. Use `bun test --timeout 30000 ./tests/<name>.test.ts`, real temporary SQLite databases, and `createApp().fetch` for API assertions.
- Package scripts: `dev` runs `bun --hot src/server.ts`; `start` runs production-mode `bun src/server.ts`; `typecheck` invokes `tsc --noEmit`; `build` runs `bun build --compile ./src/server.ts --outfile ./dist/produce-intelligence.exe`; `test` runs `bun test --timeout 30000 ./tests`; `demo`, `simulate` and `load-test` invoke the named scripts/CLI above. Use strict TypeScript, React JSX transform, DOM/Bun types and a typed HTML import declaration. Do not assume the installed Bun has undocumented `check` or `fmt` commands.
- Final command gates: `bun run typecheck`, `bun run build`, `bun test --timeout 30000 ./tests`, and `bun run load-test`. Each must exit 0; build output must be launched and inspected through a real browser.
- Browser QA: executor loads the browser skill and drives real Setup/Login and business workflows. Screenshots at 1440x1000 and 390x844, both system themes. Inspect captures for blank/overlapping/clipped states; keyboard-test forms and dialogs. No browser QA may require the user to click.
- Per-task evidence: `.omo/evidence/software/task-N.md`, command transcript plus assertions/negative cases; browser tasks add screenshots. Final evidence `.omo/evidence/software/final-{1,2,3,4}.md`.
- Load gate: seed 1,000 lots/10,000 observations in an isolated synthetic data directory, 5 authenticated sessions, 500 mixed list/detail and 100 mutation requests over loopback. Require zero unexpected failures, no lost updates/quantity violations, read/write p95 <=1,000 ms on this workstation. Record dataset, runtime, host and achieved metrics. This is a software engineering target, not a field-performance promise.
- Recovery gate: backup a committed state; interrupt/restart test instance without losing committed transactions; restore an explicit snapshot into a new isolated directory and verify entity counts, lineage, holds and audit. No claim of restoring data newer than the chosen snapshot.
- Security gate: cross-tenant tests cover all modules, evidence downloads, exports, reports and licensed recipe history; invalid device credentials, CSRF/Origin, path traversal and duplicate bodies must fail without effects.
- Failure tests must assert database/audit/quantity effects, not only HTTP status or mirrored mocks. Scientific/physical acceptance remains the PRD V1-V7 gates; passing software tests cannot satisfy them.

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
Four waves of six implementation tasks; dependencies inside a wave still apply. A barrier completes each wave before the next. The task matrix is authoritative. Parallel workers own distinct files; edits to shared contracts, migration and route composition are serialized by the lead. Each module exports route handling through the shared `RouteContext`; wire it in `app.ts` only after its unit/API tests pass.

Wave A (1-6): application foundation, schema, identity, evidence/audit, UI shell, simulator.
Wave B (7-12): intake, observations, quality, inventory, routing, receiving/operator UI.
Wave C (13-18): recipes, adaptation, production, licensing, fulfillment, kitchen UI.
Wave D (19-24): operations UI, commercial UI, evaluations, governance/recovery, packaging, complete cross-module integration.

Current provider inventory lacks an available architect lane. Recommend `deep-low` for all implementation tasks, including UI workers with frontend/browser skills, rather than a category whose configured providers cannot start. No implementation child is spawned during planning.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | none | 2-6 | none |
| 2 | 1 | 3-6 | none |
| 3 | 2 | 4-6 | none |
| 4 | 3 | 6 | 5 |
| 5 | 3 | 12,18-20 | 4,6 |
| 6 | 4 | 8,11 | 5 |
| 7 | Wave A | 8-12 | none |
| 8 | 7 | 9,12 | 10 |
| 9 | 8 | 11,12,14 | 10 |
| 10 | 7 | 11,12,14,15 | 8,9 |
| 11 | 9,10 | 12,19 | none |
| 12 | 7-11 | 18-20 | none |
| 13 | Wave B | 14-18 | 16 contract analysis |
| 14 | 13 | 15,18 | 16 |
| 15 | 14,16 | 17,18 | none |
| 16 | 13 | 15,18,20 | 14 |
| 17 | 15 | 18,20 | 16 |
| 18 | 13-17 | 24 | none |
| 19 | Wave C | 24 | 20,21 |
| 20 | Wave C | 24 | 19,21 |
| 21 | Wave C | 24 | 19,20,22 |
| 22 | Wave C | 23,24 | 21 |
| 23 | 19-22 | 24 | none |
| 24 | 19-23 | F1-F4 | none |
| F1-F4 | 1-24 | handoff | one another, read-only |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Establish runnable typed application and test boundary
  Recommended task executor category: deep-low - establish a concrete small application foundation.
  What to do / Must NOT do: Create package/config files, `src/server.ts`, `src/server/{app,config,http}.ts`, shared contracts and minimal HTML entry. Implement `createApp`, `/api/v1/health`, production build and exact scripts from Verification strategy. Bind only at the entrypoint; do not seed or build business placeholders. Pin dependencies and document runtime version.
  Closes: GAP-1, GAP-2, GAP-4.
  Parallelization: Wave A | Blocked by: none | Blocks: 2-6.
  References: This plan fixed layout/transport; PRD Sections 3, 8; Context7 `/oven-sh/bun`, native fullstack serving documentation.
  Acceptance criteria: `bun run typecheck`, `bun run build` and `bun test --timeout 30000 ./tests/foundation.test.ts` pass; factory serves requests without opening a port and closes resources.
  QA scenarios: Happy - run those commands and launch built server via monitored background process, fetch health. Failure - invalid data directory/config returns actionable startup error without overwriting files; unknown API returns structured 404. Evidence: `.omo/evidence/software/task-1.md`.
  Commit: N - not authorized.

- [ ] 2. Implement transactional schema and immutable domain types
  Recommended task executor category: deep-low - implement explicit relational constraints and shared value types.
  What to do / Must NOT do: Create `db.ts`, `001-foundation.ts` exporting SQL, shared units/states/contracts for all tables in Persistence contract. Required uniqueness: memberships `(org,user,role)`, observation/source event, integration `(org,device,event)`, inventory effect source, usage `(org,batch,kind)`, version `(org,parent,version)`. Add FK/indexes, revision checks and atomic migration. Do not use a generic JSON records table.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave A | Blocked by: 1 | Blocks: 3-6.
  References: This plan Persistence contract; PRD Section 7, NFR-02, NFR-05.
  Acceptance criteria: `bun test --timeout 30000 ./tests/foundation.test.ts` proves fresh migration, reopen persistence, FK tenant constraints, rollback and integer-unit conversion; typecheck passes.
  QA scenarios: Happy - write/reopen a temporary database and verify exact committed values. Failure - inject a failing second write inside one transaction; neither domain nor audit effect survives. Reject cross-tenant FK and implicit count/mass conversion. Evidence: `.omo/evidence/software/task-2.md`.
  Commit: N - not authorized.

- [ ] 3. Implement account bootstrap sessions and tenant permissions
  Recommended task executor category: deep-low - implement and prove the authentication boundary.
  What to do / Must NOT do: Implement `auth.ts` and permission matrix. Routes: `POST /setup`, `/auth/login`, `/auth/logout`; `GET /auth/me`; owner `POST /organizations`, `/users`, `/memberships`; `PATCH /users/:id`; `POST /auth/organization`. Use the shared session/password/role contract, setup lock and throttling. No default credentials or self-service public registration.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave A | Blocked by: 2 | Blocks: 4-6.
  References: This plan Authorization contract; PRD FR-01, FR-25, NFR-01.
  Acceptance criteria: `bun test --timeout 30000 ./tests/auth.test.ts` verifies all role checks, organization selection, cookie flags, expiry, logout, disabled-user/membership changes, Origin checks and generic login denial.
  QA scenarios: Happy - bootstrap owner, create another tenant/user, log in and switch only authorized organizations. Failure - concurrent setup creates one owner; wrong password, revoked membership, expired session, cross-origin mutation and another-tenant ID cannot grant access. Evidence: `.omo/evidence/software/task-3.md`.
  Commit: N - not authorized.

- [ ] 4. Implement atomic audit and protected evidence storage
  Recommended task executor category: deep-low - enforce provenance and private file boundaries.
  What to do / Must NOT do: Implement `audit.ts`, `evidence.ts`; `POST /evidence`, `GET /evidence/:id`, `GET /audit`. Upload limit 10 MiB; accept PNG/JPEG/WebP with signature validation or opaque document attachment; generate storage names and checksums, never execute content. Authorization precedes downloads. Garbage-collect failed/unreferenced uploads through explicit governance cleanup, not silent business deletion.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave A | Blocked by: 3 | Blocks: 6.
  References: PRD FR-03, FR-05, Section 7, NFR-01; this plan audit/trust boundary.
  Acceptance criteria: `bun test --timeout 30000 ./tests/evidence.test.ts` verifies atomic domain/audit effects, supersession, file checksum, authorized image/document download and no secrets in events.
  QA scenarios: Happy - upload evidence and retrieve through its authenticated metadata route. Failure - path traversal, oversized body, spoofed image, another tenant or revoked user fails; a rolled-back mutation leaves no misleading success audit. Evidence: `.omo/evidence/software/task-4.md`.
  Commit: N - not authorized.

- [ ] 5. Build accessible application shell and identity screens
  Recommended task executor category: deep-low - UI implementation with frontend/browser skills on available providers.
  What to do / Must NOT do: Implement Shell, form/table/status/error/dialog components, API client, Setup/Login, navigation and theme-responsive CSS. Wire session state to the actual server. Enforce clear empty/loading/error/conflict rendering and organization identity; no localStorage credentials or fake summary values.
  Closes: GAP-1, GAP-2.
  Parallelization: Wave A | Blocked by: 3 | Blocks: 12,18-20.
  References: This plan UI contract; PRD NFR-01, NFR-04; React official form/state documentation.
  Acceptance criteria: Built application boots to Setup or Login as appropriate; browser setup/login/logout works with keyboard and persists session across refresh; server rejects direct unauthorized APIs.
  QA scenarios: Happy - browser skill drives setup/login/organization display at 1440x1000 and 390x844 in both themes. Failure - wrong login and API disconnection show actionable errors without losing entered nonsecret fields; no clipped controls or blank pages. Evidence: `.omo/evidence/software/task-5.md` and screenshots.
  Commit: N - not authorized.

- [ ] 6. Implement device admission and isolated failure simulator
  Recommended task executor category: deep-low - define a trustworthy event boundary before domain effects.
  What to do / Must NOT do: Implement device create/credential rotate/revoke/status routes and `/device-events`, idempotent admission and simulator CLI/scenarios. Dispatch validated events to domain handlers when installed; unsupported domain events return explicit error and are not falsely accepted. Enforce separate mode/directory credentials and persistent origin. Device heartbeat stale threshold is configurable, default 60 seconds for simulated software tests.
  Closes: GAP-3, GAP-4, GAP-5.
  Parallelization: Wave A | Blocked by: 4 | Blocks: 8,11.
  References: This plan Device contract; PRD FR-05, FR-11, FR-13..14, NFR-03, NFR-08.
  Acceptance criteria: `bun test --timeout 30000 ./tests/integration.test.ts` proves event schema/auth/mode isolation, duplicate/conflicting identity and credential revocation. `bun run simulate -- --scenario happy` uses real HTTP, never direct database writes.
  QA scenarios: Happy - simulation heartbeat/observation envelope is admitted once. Failure - same id/different payload, revoked device, wrong tenant/mode and invalid correlation fail without effects; disconnect becomes stale. Evidence: `.omo/evidence/software/task-6.md`.
  Commit: N - not authorized.

- [ ] 7. Implement supplier lot and sample receiving workflows
  Recommended task executor category: deep-low - implement traceable receiving records.
  What to do / Must NOT do: Implement intake module; list/create/update `/suppliers`, `/lots`, `/lots/:id/samples`, and lot detail/lineage endpoints. Store provenance/unknown fields, incoming quantities and location; receiving commits one ledger event and audit. Correction uses expectedRevision; do not create repeated stock on retry.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave B | Blocked by: Wave A | Blocks: 8-12.
  References: PRD FR-01..03, Section 5; this plan identity and inventory contracts.
  Acceptance criteria: `bun test --timeout 30000 ./tests/intake.test.ts` proves supplier->lot->sample traceability, pagination, repeated receiving idempotency and persistent reopening.
  QA scenarios: Happy - receive 100 g and create a sample, retaining unknown cultivar as unknown. Failure - invalid quantity, another-tenant supplier, stale revision and duplicated receiving cannot corrupt stock or provenance. Evidence: `.omo/evidence/software/task-7.md`.
  Commit: N - not authorized.

- [ ] 8. Implement observation calibration and model evidence records
  Recommended task executor category: deep-low - preserve distinct attribute and provenance semantics.
  What to do / Must NOT do: Implement observations module; `/observations`, `/observations/:id/supersede`, `/calibrations`, `/models`, `/models/:id/suspend`, `/:id/evaluations`, `/:id/activate-version`. Validate Observation contract, calibration scope/time, model domains/monitoring policy and protected evidence. Failed paired-reference evaluation suspends the version. Device events use the same logic. No invented model inference or null-to-zero conversion.
  Closes: GAP-1, GAP-4, GAP-5.
  Parallelization: Wave B | Blocked by: 7 | Blocks: 9,12.
  References: PRD FR-03..06, FR-11, NFR-05; this plan Observation contract.
  Acceptance criteria: `bun test --timeout 30000 ./tests/observations.test.ts` covers each attribute type, measured/model/simulation origin, correction, expiry and domain mismatch.
  QA scenarios: Happy - register calibration and a measured SSC interval linked to a sample. Failure - SSC mislabeled as sugar, incompatible basis, expired calibration, foreign evidence or missing uncertainty remains invalid/review and cannot silently become approved. Evidence: `.omo/evidence/software/task-8.md`.
  Commit: N - not authorized.

- [ ] 9. Implement versioned quality specifications decisions and holds
  Recommended task executor category: deep-low - implement explainable bounded suitability.
  What to do / Must NOT do: Implement quality module; `/specifications`, `/specifications/:id/versions`, `/:id/activate-version`, `/quality-decisions`, `/quality-decisions/:id/override`, `/holds`, `/holds/:id/release`. Classify immutable snapshots and return reasons; recheck expiry/suspension. Expose independent holds and ancestry restrictions. Rollback changes active version with audit, never clears holds.
  Closes: GAP-1, GAP-4, GAP-5.
  Parallelization: Wave B | Blocked by: 8 | Blocks: 11,12,14.
  References: PRD FR-07..11, FR-21; this plan Specs/Holds contracts.
  Acceptance criteria: `bun test --timeout 30000 ./tests/quality.test.ts` proves suitable/unsuitable/review, interval boundaries, commodity/domain matching, immutable decisions and role-specific release.
  QA scenarios: Happy - classify two uses differently without changing observations. Failure - lot sample cannot certify all items; a good grade/override cannot clear safety or withdrawal hold; suspended/expired dependency blocks new release. Evidence: `.omo/evidence/software/task-9.md`.
  Commit: N - not authorized.

- [ ] 10. Implement inventory reservations split merge and reconciliation
  Recommended task executor category: deep-low - protect quantity conservation under concurrency.
  What to do / Must NOT do: Implement inventory module; `/inventory`, `/inventory/events`, `/reservations`, `/reservations/:id/release`, `/lots/:id/split`, `/lots/blend`, `/inventory/reconcile`, `/lots/:id/lineage`. Persist append-only ledger and transactionally maintained balances; include losses, count/mass bases, acyclic ancestry and hold inheritance.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave B | Blocked by: 7 | Blocks: 11,12,14,15.
  References: PRD FR-15..16, NFR-02; this plan Inventory/Lineage/Holds contracts.
  Acceptance criteria: `bun test --timeout 30000 ./tests/inventory.test.ts` proves ledger/balance agreement, split/blend conservation and reservation serialization.
  QA scenarios: Happy - transfer, sample, split and blend known masses and traverse both directions. Failure - two concurrent 80 g reservations against 100 g yield one success, one insufficient-stock result and 20 g available; held ancestry, cycles, negative mass and unsupported conversions fail. Evidence: `.omo/evidence/software/task-10.md`.
  Commit: N - not authorized.

- [ ] 11. Implement routing outcomes faults and controlled recovery
  Recommended task executor category: deep-low - reconcile physical facts independently of authorization.
  What to do / Must NOT do: Implement routing module and simulator event handlers; `/routing/commands`, `/routing/commands/:id`, `/routing/commands/:id/reconcile`, device acknowledgements/outcomes/faults. Enforce state/revision/source/destination identity; unknown outcome causes hold. Never replay uncertain actuation automatically or treat software as physical interlock.
  Closes: GAP-1, GAP-3, GAP-4.
  Parallelization: Wave B | Blocked by: 9,10 | Blocks: 12,19.
  References: PRD FR-12..17, NFR-02..03, NFR-08; this plan Routing and Device contracts.
  Acceptance criteria: `bun test --timeout 30000 ./tests/routing.test.ts` proves acknowledgements have no movement effect, confirmed 30 g event duplicates have one effect, and late confirmed facts preserve current holds.
  QA scenarios: Happy - simulator routes identified stock and ledger changes once. Failure - identity-loss/disconnection/fault, same-id conflicting payload and late outcome after withdrawal enter reconciliation without clearing holds or losing the actual fact. Evidence: `.omo/evidence/software/task-11.md`.
  Commit: N - not authorized.

- [ ] 12. Deliver receiving measurement and quality operator screens
  Recommended task executor category: deep-low - connect real domain APIs to usable receiving screens.
  What to do / Must NOT do: Implement Lots, Measurements and Quality pages with supplier/lot/sample details, observation forms/evidence, use-specific classification, calibration/specification versions, reasons and hold controls. Use paginated real APIs, show sampling and simulation scope clearly, and cross-link inventory.
  Closes: GAP-1, GAP-4, GAP-5.
  Parallelization: Wave B | Blocked by: 7-11 | Blocks: 18-20.
  References: PRD FR-01..11, NFR-04; this plan UI contract and task 5 components.
  Acceptance criteria: Browser creates a lot and sample, uploads evidence, records valid and invalid observations, classifies and inspects reasons after refresh.
  QA scenarios: Happy - agent drives the complete receiving workflow at desktop/mobile in both themes. Failure - invalid unit, expired calibration, empty list, denied hold release and stale edit show actionable errors without fabricated success. Evidence: `.omo/evidence/software/task-12.md` and screenshots.
  Commit: N - not authorized.

- [ ] 13. Implement immutable private and platform recipe versions
  Recommended task executor category: deep-low - define recipe ownership and version boundaries.
  What to do / Must NOT do: Implement recipes module; `/recipes`, `/recipes/:id/versions`, `/recipes/:id/approve`, `/recipes/:id/retire`, and platform-admin `/catalog/recipes`/versions. Validate ingredient masses, steps, equipment, yields, targets, domains, process/allergen constraints and origin. Establish central `authorizeRecipe(action,reference,actor,batch?)` using current stored entitlements, default deny. Never mutate an approved version or expose another tenant's private recipe.
  Closes: GAP-1, GAP-4, GAP-5.
  Parallelization: Wave C | Blocked by: Wave B | Blocks: 14-18.
  References: PRD FR-18, FR-21, FR-25..27, Section 7; this plan Recipe and catalog contracts.
  Acceptance criteria: `bun test --timeout 30000 ./tests/recipes.test.ts` proves approved immutability, private/catalog separation, authorization and retirement without history loss.
  QA scenarios: Happy - chef creates/approves a private sauce version; platform-admin creates a distinct catalog recipe. Failure - organization owner without chef/platform authority, cross-tenant private reference, invalid constraints and edited approved version fail. Evidence: `.omo/evidence/software/task-13.md`.
  Commit: N - not authorized.

- [ ] 14. Implement deterministic bounded adaptation and reservation approval
  Recommended task executor category: deep-low - implement bounded policy behavior with explicit infeasibility.
  What to do / Must NOT do: Add `/adaptations`, `/adaptations/:id/approve`, `/adaptations/:id/cancel`; implement deterministic policy evaluation from the fixed contract, reasons and immutable snapshots. Use fixed decimal/scaled integer arithmetic and declared final rounding. Approval atomically reserves eligible stock; never clamp out-of-range changes or invent taste formulas.
  Closes: GAP-1, GAP-4, GAP-5.
  Parallelization: Wave C | Blocked by: 13 | Blocks: 15,18.
  References: PRD FR-19..22, FR-24, Section 12; this plan Adaptation/Inventory contracts.
  Acceptance criteria: `bun test --timeout 30000 ./tests/adaptation.test.ts` proves identical snapshot/instructions, multiple-rule order determinism, bounds, unit basis, evidence expiry and concurrent approval.
  QA scenarios: Happy - simulation policy produces exact bounded quantities and a reserved snapshot. Failure - decisive missing/uncertain/out-of-domain evidence, forbidden ingredient change, incompatible basis or insufficient stock returns unavailable/review with no partial reservation. Evidence: `.omo/evidence/software/task-14.md`.
  Commit: N - not authorized.

- [ ] 15. Implement production authorization execution and actual yield
  Recommended task executor category: deep-low - enforce current eligibility at the production boundary.
  What to do / Must NOT do: Implement production module; `/production-batches`, `/:id/start`, `/:id/events`, `/:id/complete`, `/:id/cancel`, `/:id/instructions`. Recheck pinned dependencies/holds/reservations/rights atomically at start. Record actual consumed inputs, step facts, substitutions, deviations, loss and finished output; complete stock/usage/audit effects transactionally.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave C | Blocked by: 14,16 | Blocks: 17,18.
  References: PRD FR-21..24, FR-29; this plan Adaptation/Production/Licensing contracts.
  Acceptance criteria: `bun test --timeout 30000 ./tests/production.test.ts` proves state transitions, actual mass reconciliation, start idempotency, no consumption fabricated merely by start and denied stale approval.
  QA scenarios: Happy - start approved batch, record actual steps/yield and complete once. Failure - corrected evidence, changed reservation, withdrawal, revoked right or unapproved substitution blocks new authorization; late actual facts remain recordable for a started held batch without enabling new execution. Evidence: `.omo/evidence/software/task-15.md`.
  Commit: N - not authorized.

- [ ] 16. Implement recipe entitlements permissions and usage disputes
  Recommended task executor category: deep-low - enforce commercial rights at disclosure and execution.
  What to do / Must NOT do: Implement licenses module; platform-admin `/licenses`, `/:id/revoke`; tenant `/licenses`, `/usage`, `/usage/:id/disputes`; explicit recipe `/permissions` changes by owner/authorized rights holder. Use the central authorization boundary from task 13 for browse/read/execute/export/derive/train. Provide usage-recording helper invoked atomically by task 15 at successful start, append adjustments, and expose local usage totals without live payment processing.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave C | Blocked by: 13 | Blocks: 15,18,20.
  References: PRD FR-25..29, NFR-01, Section 9; this plan catalog and entitlement contract.
  Acceptance criteria: `bun test --timeout 30000 ./tests/licenses.test.ts` proves entitlement interval/revocation, execution and export distinctions, one usage effect, dispute history and restricted started-batch access.
  QA scenarios: Happy - entitled organization executes catalog recipe and sees usage. Failure - unentitled/expired/revoked tenant cannot browse contents or start a new batch; an already-started batch can read its pinned instructions without cloning/catalog/export rights. Evidence: `.omo/evidence/software/task-16.md`.
  Commit: N - not authorized.

- [ ] 17. Implement branded products orders delivery and withdrawals
  Recommended task executor category: deep-low - connect fulfillment to traceable material and release constraints.
  What to do / Must NOT do: Implement fulfillment module; `/products`/versions, `/orders`, `/:id/allocate`, `/:id/packages`, `/:id/ready`, `/:id/dispatch`, `/:id/delivery-events`, `/complaints`, `/withdrawals` and impact/action endpoints. Support partial allocation/contribution quantities, packaging/arrival constraints and reverse lineage. No external courier action or consumer message is sent.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave C | Blocked by: 15 | Blocks: 18,20.
  References: PRD FR-30..34, V7, Sections 7 and 12; this plan Orders/Withdrawal contracts.
  Acceptance criteria: `bun test --timeout 30000 ./tests/fulfillment.test.ts` proves product version, non-overallocation, ingredient-to-order/reverse traceability, failed arrival and withdrawal scope.
  QA scenarios: Happy - allocate production across two orders, package/dispatch/deliver and record feedback. Failure - held ancestor or failed condition blocks readiness/dispatch; a later complaint/withdrawal finds all impacted orders through blends and partial allocations while leaving unrelated stock eligible. Evidence: `.omo/evidence/software/task-17.md`.
  Commit: N - not authorized.

- [ ] 18. Deliver recipe adaptation and kitchen production screens
  Recommended task executor category: deep-low - connect culinary and production workflows to real permissions.
  What to do / Must NOT do: Build Recipes and Production pages with version authoring, policy bounds, approval, adaptation reasons/diffs, reservation snapshot, executable steps, deviations and finished observations. Licensed contents load only through authorized APIs. Show exact units/origin and stale-regeneration action; no unvalidated taste-confidence graphic.
  Closes: GAP-1, GAP-4, GAP-5.
  Parallelization: Wave C | Blocked by: 13-17 | Blocks: 24.
  References: PRD FR-18..29, NFR-04; tasks 5,13-16 UI/domain contracts.
  Acceptance criteria: Browser drives private recipe->adaptation->approval->production->actual yield, refreshes history and observes restricted recipe access correctly.
  QA scenarios: Happy - execute full simulation sauce workflow on desktop/mobile in both themes. Failure - change input after proposal, revoke entitlement and try a prohibited substitution; each shows reasons and safe available actions rather than false success. Evidence: `.omo/evidence/software/task-18.md` and screenshots.
  Commit: N - not authorized.

- [ ] 19. Deliver inventory routing and reconciliation operations screens
  Recommended task executor category: deep-low - expose actual quantities and unresolved physical outcomes.
  What to do / Must NOT do: Build Inventory and Routing pages, location/availability/ancestry views, reservation list, mass-balance details, command timeline, stale device state and reconciliation queue. Hold/release uses correct role/reason; simulator controls clearly identify mode and actual HTTP run results.
  Closes: GAP-1, GAP-3, GAP-4.
  Parallelization: Wave D | Blocked by: Wave C | Blocks: 24.
  References: PRD FR-12..17, NFR-03..04; tasks 10-11 and UI contract.
  Acceptance criteria: Browser sees a simulated confirmed transfer, quantity reconciliation and lineage; refresh/restart preserves queue and stock.
  QA scenarios: Happy - route stock, inspect its timeline and resolve a known discrepancy with evidence. Failure - identity loss or delayed duplicate shows one stock effect and unresolved hold, never an automatic retry/resume. Capture desktop/mobile/theme states. Evidence: `.omo/evidence/software/task-19.md` and screenshots.
  Commit: N - not authorized.

- [ ] 20. Deliver licensing orders complaints and commercial screens
  Recommended task executor category: deep-low - make commercial/fulfillment state transitions usable.
  What to do / Must NOT do: Build Licenses and Orders pages for catalog entitlements, grant/revocation permissions, usage/disputes, product versions, partial allocations, packaging/dispatch/delivery, complaints and withdrawal impact. Expose authorized operator-entered consumer feedback; do not invent consumer/supplier portals.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave D | Blocked by: Wave C | Blocks: 24.
  References: PRD FR-25..34, NFR-04; tasks 16-17 and this plan UI contract.
  Acceptance criteria: Browser creates entitled access, views usage, allocates an order and traces a withdrawal to its ingredients; ordinary tenant owners cannot use platform-admin controls.
  QA scenarios: Happy - operator completes order delivery and records feedback. Failure - revoked content, denied role, overallocated mass and failed arrival show actionable outcomes with no extra billing/stock effect. Evidence: `.omo/evidence/software/task-20.md` and responsive screenshots.
  Commit: N - not authorized.

- [ ] 21. Implement evaluation protocols real metrics and operating economics
  Recommended task executor category: deep-low - calculate outcomes from recorded evidence rather than demo constants.
  What to do / Must NOT do: Implement evaluations module, Overview and Analytics; `/evaluations`, `/:id/freeze`, `/:id/results`, `/costs`, `/metrics`. Protocols pin baseline/population/endpoints/replication/thresholds before results; editing afterward creates a new version. Compute PRD metrics from ledger/events, batch sensory/physical observations, cost entries and eligible denominators, separating tenants and simulation modes.
  Closes: GAP-1, GAP-4, GAP-5.
  Parallelization: Wave D | Blocked by: Wave C | Blocks: 24.
  References: PRD Sections 9-11, FR-11, FR-24, NFR-05..06.
  Acceptance criteria: `bun test --timeout 30000 ./tests/evaluations.test.ts` proves known fixtures yield exact counts/cost totals, abstentions/failures remain in denominators, zero denominator renders unavailable, and frozen protocols cannot be rewritten.
  QA scenarios: Happy - record fixed/adaptive batch assessments and operating costs, then inspect computed comparisons and source links. Failure - missing replication/evidence cannot display validated improvement; no data shows empty state, no simulated result becomes physical proof. Evidence: `.omo/evidence/software/task-21.md` plus browser captures.
  Commit: N - not authorized.

- [ ] 22. Implement governance exports deletion and tested recovery
  Recommended task executor category: deep-low - preserve private rights and consistent recoverable state.
  What to do / Must NOT do: Implement governance module, Administration page, `/exports`, `/retention-policy`, `/deletions/preview`, `/deletions/apply`, account disable and audit/device administration. Implement backup/restore CLI per fixed contract, checksum manifest and deletion-instruction replay. Require server stopped/new directory for restore; no active-store overwrite.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave D | Blocked by: Wave C | Blocks: 23,24.
  References: PRD Section 7, NFR-01, NFR-05, NFR-07; lifecycle/backup contract.
  Acceptance criteria: `bun test --timeout 30000 ./tests/governance.test.ts` proves permission-aware export, pseudonymized identity with retained restricted evidence, consistent DB/file backup and restored hold/credential invalidation.
  QA scenarios: Happy - snapshot known stock, restore separately, verify exact lineage/counts/audit and complete reconciliation before mutations. Failure - corrupt/missing evidence, active output directory, unauthorized export, revived deleted identity or old credentials cannot restore access. Evidence: `.omo/evidence/software/task-22.md`.
  Commit: N - not authorized.

- [ ] 23. Package Windows startup demo mode and reproducible operations
  Recommended task executor category: deep-low - ship a runnable local product with explicit operating boundaries.
  What to do / Must NOT do: Complete `start.cmd`, setup/demo/load scripts and docs. Launcher runs `dist/produce-intelligence.exe` when built; if absent, checks Bun and builds before launching. It preserves existing storage and shows actionable missing-runtime/build errors; setup is browser-based. `bun run demo` runs isolated simulation data at port 3001; `bun run start` uses unseeded operational data at 3000. Document roles, shutdown, logs, backup/restore, device contracts and physical/live-data gates. Add the frozen load test above.
  Closes: GAP-1, GAP-2, GAP-3, GAP-5.
  Parallelization: Wave D | Blocked by: 19-22 | Blocks: 24.
  References: PRD NFR-06..08, Sections 13-15; this plan config/verification contracts.
  Acceptance criteria: `bun run build`, startup from the built output, `bun run load-test`, and launcher in a path containing spaces work. Record exact installed/runtime versions and measured results.
  QA scenarios: Happy - fresh operational setup and separate repeatable demo both run without cloud credentials; load target passes. Failure - existing DB is never reseeded, occupied port gives actionable error, missing Bun explains setup, malformed/cross-mode simulator input is rejected. Evidence: `.omo/evidence/software/task-23.md`.
  Commit: N - not authorized.

- [ ] 24. Complete cross module journeys and requirement evidence
  Recommended task executor category: deep-low - integrate delivered modules and correct only in-scope broken flows.
  What to do / Must NOT do: Finish route composition/navigation/deep links, ensure all forms call their actual APIs, and populate `docs/requirements.md` mapping every FR/NFR and non-numbered lifecycle/economics obligation to implementation/test evidence. Exercise persisted cross-module journeys and fix integration defects without replacing any feature with a stub. Do not claim real hardware or sensory results.
  Closes: GAP-1, GAP-2, GAP-3, GAP-4, GAP-5.
  Parallelization: Wave D | Blocked by: 19-23 | Blocks: F1-F4.
  References: Complete PRD; all plan contracts/tasks; `docs/requirements.md` output.
  Acceptance criteria: `bun run typecheck`, `bun run build`, `bun test --timeout 30000 ./tests`, `bun run load-test` pass; browser completes both normal and failure journeys against built server, with restart persistence.
  QA scenarios: Happy - receive->observe->classify->route->reserve->adapt->cook->license usage->order->delivery->analytics/export. Failure - held ancestor through blend/production/partial order, expired evidence, late duplicate routing, revoked rights and restored deletion preserve restrictions and accurate facts. Evidence: `.omo/evidence/software/task-24.md`, full command logs and browser screenshots.
  Commit: N - not authorized.

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
  Read the PRD and `docs/requirements.md`, inspect implementations and actual evidence, and verify every FR-01..34/NFR-01..08 plus lifecycle/economics coverage. Reject simulator/physical confusion, deferred software requirements or self-reported passes without artifacts. Evidence `.omo/evidence/software/final-1.md`.
- [ ] F2. Code quality review
  Inspect changed source, schema, permission checks, transactions, dependencies and tests for concrete security/data-loss issues and consistency with this plan. Review domain failures, not source-string assertions. Run no duplicate successful check unless a later edit invalidated it. Evidence `.omo/evidence/software/final-2.md`.
- [ ] F3. Real manual QA
  Agent drives the built executable in a real browser at specified desktop/mobile sizes and both themes. Execute normal operational setup plus isolated full simulation journey, inspect screenshots, restart persistence and failures from task 24. Record URL, server mode, exact actions/outcomes, captures and console failures. Evidence `.omo/evidence/software/final-3.md`.
- [ ] F4. Ideal-state fidelity
  Verify IS-1..IS-8 one by one through observable behavior and referenced tests/screens, including private catalog access, simulator isolation, current safety holds, late facts and restore. Any missing software behavior becomes an in-scope fix; future scientific/physical gates stay explicitly unclaimed. Evidence `.omo/evidence/software/final-4.md`.

## Commit strategy
No git commit is authorized. If execution requires worktree isolation, first establish whether the workspace is a git checkout; it currently is not. Do not initialize or commit solely to satisfy a tooling assumption without explicit permission. Implement locally without isolation when the executor supports it, preserving `.omo/` artifacts; report any executor-only worktree prerequisite before making unrelated changes.

## Success criteria
> One row per IS row. The plan is complete only when every IS row has a delivering todo and a proving QA scenario; F4 checks the delivered behavior against these rows 1:1, and a shortfall becomes new `- [ ] N.` rows, never a note.
| IS | Delivering todo(s) | Proving QA scenario | Evidence |
| --- | --- | --- | --- |
| IS-1 | 3-5,16,22 | Cross-tenant session/file/catalog/export denial | `.omo/evidence/software/task-3.md`, `task-16.md`, `task-22.md` |
| IS-2 | 7-9,12 | Sample-scoped evidence, expiry, uncertainty and explainable decisions | `.omo/evidence/software/task-8.md`, `task-9.md`, `task-12.md` |
| IS-3 | 6,10-11,19 | Concurrent reservations, duplicate/late movement, lineage and reconciliation | `.omo/evidence/software/task-10.md`, `task-11.md`, `task-19.md` |
| IS-4 | 13-15,18 | Deterministic adaptation, stale snapshot, actual execution and yield | `.omo/evidence/software/task-14.md`, `task-15.md`, `task-18.md` |
| IS-5 | 16,20-21 | Revocation/history, one usage effect and source-derived economics | `.omo/evidence/software/task-16.md`, `task-20.md`, `task-21.md` |
| IS-6 | 17,20,24 | Partial order lineage, delivery exception and withdrawal impact | `.omo/evidence/software/task-17.md`, `task-24.md` |
| IS-7 | 4,9,22-24 | Independent safety disposition, retention/export and recovery rehearsal | `.omo/evidence/software/task-22.md`, `final-4.md` |
| IS-8 | 6,11,23-24 | Credential/mode isolation, duplicate/conflicting retries and late outcomes | `.omo/evidence/software/task-6.md`, `task-11.md` |

### Requirement coverage matrix

| Requirement | Delivering tasks | Required proof |
| --- | --- | --- |
| FR-01 | 3,7,12 | Tenant-scoped lot/sample access |
| FR-02 | 7,12 | Provenance remains explicit/unknown |
| FR-03 | 4,8,12 | Complete metadata and invalid-input tests |
| FR-04 | 8,12 | Distinct attributes, units and basis |
| FR-05 | 4,6,8 | Protected image/model evidence and origin |
| FR-06 | 8-9 | Null, expiry and unsupported-domain behavior |
| FR-07 | 9,12 | Immutable use-specific specifications |
| FR-08 | 9,12 | Attribute reasons retained alongside grade |
| FR-09 | 9 | Interval and sample-scope review |
| FR-10 | 9,19 | Override audit without safety bypass |
| FR-11 | 8-9,21 | Version suspension and error/coverage reports |
| FR-12 | 10-11,19 | Identity maintained or held |
| FR-13 | 6,11 | Ack versus outcome, duplicate effects |
| FR-14 | 6,11,19 | Fault/disconnect/identity recovery |
| FR-15 | 7,10,15 | Ledger conservation and concurrent reservations |
| FR-16 | 10,17 | Split/blend and reverse ancestry |
| FR-17 | 11,19,23 | Software respects approved stop/hold boundaries; physical controls unclaimed |
| FR-18 | 13,18 | Immutable recipe instructions/version |
| FR-19 | 14,18 | Exact bounded policy output |
| FR-20 | 14,18 | Explicit unavailable results |
| FR-21 | 9,14-15 | Forbidden substitution/process and safety holds |
| FR-22 | 14-15,18 | Snapshot-derived exact instructions |
| FR-23 | 15,18 | Actual steps/deviations/yield |
| FR-24 | 21 | Frozen baseline/sensory comparison records |
| FR-25 | 3,13,16 | Private recipe denial through all disclosure paths |
| FR-26 | 13,16,20 | Catalog version-specific entitlement |
| FR-27 | 16,22 | Separate explicit publication/derivative/training grants |
| FR-28 | 15-16,22 | Revocation and restricted production history |
| FR-29 | 15-16,20 | One production-start usage and auditable dispute |
| FR-30 | 17,20 | Versioned product/packaging requirements |
| FR-31 | 17,24 | Order-to-ingredient trace and partial allocations |
| FR-32 | 17,20-21 | Arrival exceptions and recorded feedback |
| FR-33 | 9,17,20 | Failed conditions/current holds block release |
| FR-34 | 10,17,20 | Withdrawal descendants and corrective actions |
| NFR-01 | 3-4,6,16,22,24 | Session/role/tenant/device/file/export negative tests |
| NFR-02 | 2,6,10-11,15,24 | Atomic, duplicate/delayed/concurrent effects |
| NFR-03 | 6,11,19 | Staleness, unavailable authorization and reconciliation |
| NFR-04 | 5,12,18-20,24 | Real-browser keyboard/responsive/theme checks |
| NFR-05 | 4,8-9,13-15,21 | Immutable historical reconstruction |
| NFR-06 | 21,23-24 | Frozen workload and measured p95/consistency |
| NFR-07 | 2,9,13,22-24 | Restore/rollback and retained audit/holds |
| NFR-08 | 6,8,10-11,17,23 | Documented contracts and failure simulator |
| PRD Section 7 lifecycle | 4,16,22 | Export, retention, deletion and restore redaction |
| PRD Sections 9-11 economics/evaluation | 21 | Complete costs, denominators, frozen protocols |
| PRD Sections 13-15 live gates | 9,13,17,22-23 | Explicit evidence/approval records; no inferred physical validation |

### Delivery and execution

Deliver the software plan only after its review status is accurately recorded. The user starts implementation separately with `/ulw-execute produce-intelligence-software`; that command must select this plan, never the PRD-writing plan. Optional executor flags are `--worktree <absolute-path>`, `--make-pr` and `--ship`; none is requested here, and the current directory is not a git checkout. Execution must not silently create a repository or select PR/merge delivery.

At implementation handoff, provide the running application URL, exact Windows start command, installed runtime/dependency versions, setup/demo instructions, pass/failure evidence and remaining physical commissioning gates. Do not report the product built merely because this planning document exists.
