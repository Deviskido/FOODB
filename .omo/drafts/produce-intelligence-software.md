---
slug: produce-intelligence-software
status: complete
intent: clear
review_required: false
plan_path: .omo/plans/produce-intelligence-software.md
plan_sha256: 347fcc49f8e34f95609830d09628e1d9e92ca25e635c39aa9d1ce647fcf27337
review_round_id: produce-intelligence-software-round-1
review_round_limit: 5
pending-action: deliver software plan and separate execution command
review:
  plan_reviewer:
    status: inconclusive
    workspace_root: C:/Users/johndoe/Downloads/omotest
    runtime_home: null
    target: .omo/plans/produce-intelligence-software.md
    round_id: produce-intelligence-software-round-1
    plan_sha256: 347fcc49f8e34f95609830d09628e1d9e92ca25e635c39aa9d1ce647fcf27337
    launch_id: produce-intelligence-software-launch-1
    session: st_01a1da16
    result: "Native content verdict OKAY, no blocking contradictions. Parent secure descriptor-bound intake unverified; full gate inconclusive."
approach: Build a local TypeScript React Bun SQLite modular application covering the complete PRD, with authenticated tenant workflows, transactional inventory, bounded recipe policies, commercial/delivery operations and explicit device simulation.
---

# Draft: produce-intelligence-software

## Affected user and ideal state
| ID | User and ideal outcome | Reason |
| --- | --- | --- |
| IS-1 | Operators sign in to an isolated organization with role-appropriate actions | Private produce, recipe and production data must remain protected |
| IS-2 | Quality staff manage lots, evidence, uncertainty and versioned classifications | Measured attributes and predictions must remain distinguishable |
| IS-3 | Robotics staff reconcile confirmed movements and material lineage | Commands alone cannot establish physical inventory |
| IS-4 | Chefs and kitchen workers approve bounded adaptations and record production | Reproducible instructions require immutable versions and eligible inputs |
| IS-5 | Owners manage private recipes, licensed access, usage and operating metrics | Commercial rights and costs must be enforceable |
| IS-6 | Brand/delivery teams trace orders and quality exceptions to ingredient lots | The full PRD includes delivery and withdrawal workflows |
| IS-7 | Administrators and safety owners control approvals, audit, export, recovery and release | Flavor decisions cannot override operational holds |
| IS-8 | Device clients have stable idempotent admission and retry/conflict behavior | Prevent duplicated facts and uncertain actuation |

GAP-1: No application code, database, authentication or operator UI exists.
GAP-2: Deployment/distribution, stack, resource envelope and software capacity targets are not chosen.
GAP-3: No actual measurement, robotics, payment or delivery provider contracts are supplied.
GAP-4: Domain state machines and requirement-to-test mapping are not specified for implementation.
GAP-5: No trained model, sensory dataset or physical validation evidence exists.
<!-- Who this output touches (a customer, another programmer, a program or agent consuming it - often more than one) and how each uses it today and will use it after. -->
<!-- IS-n | property of the ideal state: nothing snags, feels odd, regresses, or degrades for them | reason -->
<!-- GAP-n | difference between IS-n and today | reason | closed by todo(s) -->

## Components (topology ledger)
| ID | Component outcome | Status | Evidence |
| --- | --- | --- | --- |
| C1 | Produce receiving and measurement evidence | active | PRD FR-01..FR-06 |
| C2 | Classification, uncertainty and model/specification governance | active | PRD FR-07..FR-11 |
| C3 | Robotic routing, inventory and lineage | active | PRD FR-12..FR-17 |
| C4 | Recipe adaptation and production execution | active | PRD FR-18..FR-24 |
| C5 | Recipe rights, licensing, usage and economics | active | PRD FR-25..FR-29 and Sections 9-10 |
| C6 | Brand products, orders, delivery and withdrawals | active | PRD FR-30..FR-34 |

Cross-cutting: PRD NFR-01..NFR-08, tenant roles, audit, accessibility, backup/restore, integration contracts.
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
<!-- id | outcome (one line) | status: active|deferred | evidence path -->

## Open assumptions (announced defaults)
Preserve existing product decisions: foodservice customers, tomato sauces, market-neutral, private/licensed recipes.
All 34 functional and 8 nonfunctional requirements remain in scope; no reduction to a static dashboard.
Read-only planning only until a separate explicit execution start.
One-by-one questions unless the user asks to change the renderer.
The preceding request's review waiver applied to that PRD document only; new software plan review defaults on.
Do not claim generated/synthetic data, device simulations or untrained models are real equipment or validated taste predictions.
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
<!-- assumption | adopted default | rationale | reversible? -->

## Findings (cited - path:lines)
Complete plan structural/coverage/acyclic-dependency checks passed: 24 deep-low implementation tasks, four final verifiers, 42 FR/NFR rows and eight ideal-state mappings. Evidence: .omo/evidence/produce-intelligence-software-plan-qa.md.
Review round 1 launching against the exact recorded plan. Ordinary full-content SHA-256 recorded above; descriptor-relative no-follow intake remains unverified on this tool surface. Require the native reviewer to enforce its intake, and preserve an inconclusive gate if it cannot do so.
Convergence ledger: round 1; accepted content blockers none; native verdict OKAY. Receipt st_01a1da16 confirms executable content and eight mapped ideal states. Parent secure descriptor-bound intake remains unverified; full gate is inconclusive. No new blocker/closure justifies another unchanged review round. Request explicit user disposition rather than silently reusing the prior PRD waiver.
Final ordinary full-plan SHA-256 reread matches 347fcc49f8e34f95609830d09628e1d9e92ca25e635c39aa9d1ce647fcf27337; this does not substitute for no-follow descriptor binding.
Detail advisor st_01a1da04 completed. Independently compared its module map with the PRD requirement tables: C1 FR-01..06; C2 FR-07..11; C3 FR-12..17; C4 FR-18..24; C5 FR-25..29; C6 FR-30..34. Its state recommendations follow the PRD exceptions: preserve late physical facts once, reevaluate current holds and snapshots, and do not treat acknowledgements as confirmed movement.
Current primary documentation retrieved through Context7 for /oven-sh/bun and /reactjs/react.dev. Bun documents HTML/React serving with API routes and built-in SQLite transactions; transaction callbacks must be synchronous. Proposed stack awaits owner choice: TypeScript, React, Bun and SQLite.
Workspace scan: only four existing .omo Markdown files before this draft; no code, package manifest, application instructions or git checkout.
Primary specification: .omo/drafts/produce-quality-prd-document.md, Sections 1-16.
Existing .omo/plans/produce-quality-prd.md governs PRD writing, not software implementation.
PRD Sections 13 and 15 explicitly leave hardware, stack, capacity, funding and integration choices unresolved.
Available detail-design lane st_01a1da04 is performing advisory-only contract analysis.
Architect lane was already proven unavailable due to disconnected provider chain; no workspace settings change is authorized.

## Decisions (with rationale)
Final review disposition: user selected Accept, skip remaining review through the required Review gate prompt. Remaining secure-binding review is explicitly waived for this software plan. Preserve native content approval and the unverified integrity limitation; do not claim fully verified secure intake.
Approval: user selected Approve through the required Approval prompt. Authorized writing/reviewing the implementation plan, not product code.
Consultant st_01a1da0a completed with no owner-decision blocker. Integrated its contracts for role/session boundaries, atomic audit, stock conservation/concurrency, hold inheritance, late facts, transactional production start, exact usage rights, deletion/restore and structurally isolated simulator storage. Proposed numeric defaults were recommendations; retain the plan's explicit 1,000 ms p95 workload gate.
Software plan now specifies separate operational/demo instances, first-run owner setup, a distinct platform-admin catalog boundary, exact routes and state transitions, 24 implementation tasks in four waves and four final verifiers.
Capacity: user selected Small team pilot: 5 concurrent sessions, 1,000 lots and 10,000 observations. This is a software acceptance workload, not validated crop/robot performance.
Proposed engineering defaults for approval: localhost-only binding; local accounts with roles and organization isolation; server-side cookie sessions; no remote service credentials; local SQLite as stock system of record; evidence files protected by authorization; exact schema and endpoint contracts in the implementation plan.
Proposed test strategy: TDD for domain transitions and permissions, tests alongside each feature, API/persistence/restore tests, and agent-driven real-browser end-to-end/desktop/mobile QA. Domain tests include negative tenant access, stale evidence, duplicate/late outcomes, hold propagation, invalidated reservations, revoked rights and failed delivery release.
Proposed integration defaults: authenticated versioned JSON device envelope, deterministic simulator supporting real failure states, manually entered observations and courier events, and configurable versioned rule policies. Do not invent trained chemistry/taste models or external provider integrations.
Proposed operational defaults: no new authorizations without the local server; no offline physical actuation/replay; unknown equipment outcomes require reconciliation. A revoked entitlement blocks new execution; started production retains restricted audit history and can record actual outcomes without granting new recipe access.
Proposed evidence defaults: synthetic demonstration data explicitly labeled; no scientifically validated recipe/model/safety policy supplied. Actual approval gates are configurable records with role-based enforcement and evidence, not preapproved claims.
Proposed resource defaults: local-only development and test costs, no spend authorization, no paid providers, no live consumer payments/messages/courier booking.
Stack: user selected TypeScript, React, Bun and SQLite. Use a single local application process and transactional SQLite persistence; no additional service or paid vendor is implied.
Commercial integration interpretation: PRD FR-29 requires auditable entitlements and usage, not live payment processing. Plan local licensing/usage records and provider-neutral delivery events; no external payments, messaging or courier account is authorized.
Distribution: user selected Local browser app. Run backend and database on this computer, access the application in a browser, and assume no paid cloud dependency.
Hardware first-build acceptance: user selected Interfaces and simulator. Implement persistent operational workflows, documented device contracts and a clearly labeled simulator. Real device adapters and commissioning are not claimed complete by simulator tests; physical integration remains a distinct acceptance gate.

## Scope IN
Full application and automated verification plan mapped to the entire PRD, including operator UI, persistent backend, tenant roles, state transitions, history, metrics and integration behavior.

## Scope OUT (Must NOT have)
No product implementation in this planning turn; no procurement, paid service activation, deployment, fabricated model accuracy or claimed physical safety/culinary validation.

## Open questions
Owner choices resolved: interfaces/simulator, local browser app, TypeScript React Bun SQLite, small-team software capacity.
Approval must confirm the announced engineering/integration defaults and test strategy. No additional paid, destructive or public deployment action is requested.

## Approval gate
status: approved
Decision: Approve, through request_user_input.
Final disposition: implementation plan accepted with remaining secure-binding review waived through request_user_input. Product execution still requires the user's separate start.
Scope: complete PRD software implementation plan, not the prior documentation plan.
Proposed plan: 24 implementation tasks in four waves, plus four final verification tasks. Name exact schema/routes/state contracts, UI screens, requirement coverage, tests, evidence and run instructions. Implementation remains a separate execution step.
Next on explicit approval: scaffold .omo/plans/produce-intelligence-software.md, consultant gap analysis, complete all task contracts, then required native plan review.
Review caveat: the previous PRD review had an unverified secure file-binding limitation. Preserve truthful review status if the same tool limitation recurs; do not silently reuse its prior waiver.
<!-- When exploration is exhausted and unknowns are answered, set status: awaiting-approval. -->
<!-- That durable record is the loop guard: on a later turn read it and resume at the gate instead of re-running exploration. -->
