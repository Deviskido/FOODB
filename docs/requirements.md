# Implementation coverage and acceptance status

> Scope update (2026-11-18): the user requested a minimal MVP. The active delivery scope is now documented in [MVP.md](MVP.md); development status and deferred features are tracked in [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md). The full-product matrix below is retained as the expansion backlog, not the MVP acceptance checklist.

The source implementation is not a declaration that all requirements in `.omo/plans/produce-intelligence-software.md` are complete. The Bun extension still lacks installed dependencies and native build acceptance. The dependency-free Node MVP now passes 32 native Node/SQLite tests; its actual browser and Windows acceptance remain unverified because the execution environment denies a loopback listener and Chrome launch failed. Existing planning artifacts remain unchanged.

| Requirements | Implemented behavior | Evidence / remaining work |
| --- | --- | --- |
| FR-01–02 | Tenant-scoped receiving, suppliers, provenance, lots, samples | Auth/intake/inventory API tests; full browser walkthrough pending |
| FR-03–06 | Typed attributes/units, basis/scope, timestamps, uncertainty, protected attachments, model/calibration usability, supersession | Quality/evidence tests; richer observation forms and full media policy review pending |
| FR-07–09 | Immutable specification payloads, use-specific interval classification, reasons, explicit review, sample scope | Quality tests; categorical rule authoring remains API-only |
| FR-10 | Holds and explicit reasons with separate safety authority | Inventory/production tests; classification override workflow outstanding |
| FR-11 | Frozen model monitoring policy, paired reference error/coverage, automatic suspension | Model test; approved active-pointer rollback and drift dashboards outstanding |
| FR-12–14 | Confirmed identity, acknowledgement/outcome distinction, unknown-outcome hold, idempotent/late events | Routing tests and simulator; hardware is not supplied |
| FR-15–16 | Integer-mg ledger, reservations, split/blend lineage, explicit processing loss, production and order trace | Inventory and end-to-end tests; explicit count-to-mass conversion outstanding |
| FR-17 | Holds prevent new work; uncertain routing is not automatically retried | Routing/production tests; physical stop behavior is not validated |
| FR-18–20 | Immutable recipe versions, bounded additive policies, adjusted-mass reservations, unavailable outputs, fixed instructions | Adaptation tests; full interval propagation through combined adjustments and policy-authoring UI need further review |
| FR-21–23 | Commodity mapping, current quality/rights/hold checks, immutable batch instructions, actual steps, deviations, yield | Integration tests; structured per-step process-limit enforcement and explicit allergen substitution review outstanding |
| FR-24 | Frozen evaluation protocols and replicated result records | Evaluation API implemented; full fixed/adaptive sensory analysis and protocol completeness checks outstanding |
| FR-25–28 | Tenant-private recipe reads, catalog entitlements, revocation checks, saved-content redaction, explicit content-use grant records | Licensing/security tests; permission-controlled derivative/publication/export workflows remain incomplete |
| FR-29 | Exactly one successful-start usage event; append-only usage disputes | Integration tests; richer billing adjustment UI outstanding; no real payments |
| FR-30–33 | Product versions, partial allocations, packaging confirmation, dispatch, recorded delivery exceptions | Integration tests; package-unit tracking and additional condition types outstanding |
| FR-34 | Withdrawal ancestry and impacted batch/order action lists | Integration tests; operator-entered corrective actions supported, no outbound messaging |
| NFR-01 | Hashed sessions/device credentials, current role checks, tenant foreign keys, loopback/origin checks, private attachments | Auth/security/foundation/evidence tests; native password/session testing pending |
| NFR-02–03 | Transactional effects/audit, revisions, idempotency, reservations, persistent uncertainty | Inventory/routing/security tests; more concurrent reservation/device-fault scenarios needed |
| NFR-04 | Responsive keyboard-accessible form/table shell, empty/error states, light/dark CSS, hash links | Syntax checks only; real-browser accessibility/layout testing outstanding |
| NFR-05 | Version payloads, observations, ledger, production facts and audit trail | Domain tests; complete reconstruction/export coverage outstanding |
| NFR-06 | 1,000-lot/10,000-observation load script, 5 sessions, 500 reads/100 writes, 1-second p95 gate | Offline direct-handler experiment passed; native loopback acceptance pending |
| NFR-07 | Consistent snapshot, checksums, separate restore, deletion replay, credential invalidation, recovery hold | Recovery test; model/spec/recipe active rollback and guided recovery screen outstanding |
| NFR-08 | Versioned device envelope and seven simulator scenarios | Routing tests; live third-party integrations deliberately unclaimed |
| Lifecycle | Retention approval gate, operational export, account pseudonymization and external deletion journal | Governance/recovery tests; unreferenced business-data deletion and full rights-aware recipe/evidence export outstanding |
| Economics | Entered costs by currency, validity/decision coverage, counts and stock from records | Zero-denominator handling implemented; full yield/waste/labor/contribution metrics outstanding |
| Live gates | Simulation labeled and separated; no automatic physical/scientific validity claims | Dedicated commissioning approval workflow remains outstanding |

## Earlier full-product verification (historical)

- TypeScript/JSX sources parsed/transformed using a locally cached Babel implementation. This is a syntax check, not TypeScript typechecking.
- 20 API/domain/form tests passed through a temporary offline compatibility harness. The harness transpiles the unchanged sources, substitutes Node's SQLite API for `bun:sqlite`, uses Node's test runner, and substitutes local cryptographic APIs for Bun APIs. It is not the shipping runtime or a native acceptance result.
- The pre-MVP source revision passed the synthetic dataset through direct HTTP-handler requests: 500 reads, 100 writes, five sessions, zero errors, read p95 about 32.06 ms, write p95 about 33.31 ms. This excludes native Bun serving and network transport; the checked-in native load script is the authoritative acceptance gate.

See `.omo/evidence/software/offline-tests.txt` and `offline-load.txt` for recorded output. No browser screenshots, successful native build, pinned dependency versions, or Windows execution evidence are claimed.

## Current MVP verification

`npm run verify:mvp` passed with 32 tests against the shipping Node runtime adapter and actual SQLite/password implementations. See `mvp-native-node-tests.txt`. The Node path has no external package requirement and uses the same domain API. `mvp-listener-probe.json` records an EPERM listener failure with successful lock cleanup. No browser rendering, public deployment, Windows execution, or current MVP performance result is claimed.
