# produce-quality-prd - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**Who this is for and what changes for them:** The founder and future product team receive a shared product definition. Foodservice, quality, kitchen, safety and commercial stakeholders can see what the system must do and how its claims will be tested.

**What you'll get:** A complete PRD covering produce measurements, quality classification, robotic sorting, adaptive recipes, recipe licensing, and the eventual food brand and delivery business. It includes requirements, workflows, economics, data responsibilities, exceptions and release gates.

**Why this approach:** Anchor the initial requirements on tomato sauces for foodservice operators while preserving the full business vision. Separate measured attributes, predictions and sensory outcomes so useful consistency must be demonstrated in finished food.

**What it will NOT do:** Build the platform, purchase equipment, operate food production, invent performance or financial results, or select a launch country.

**Effort:** Medium
<!-- Effort is exactly ONE band, never hours/days. Quick = single edit, minutes of agent work; Short = one focused change, a few files; Medium = multi-file feature in one session; Large = several waves, one long session; XL = multi-session or architectural work. A written duration is rewritten to a band. -->
**Risk:** Medium - document completeness is testable, but sensing, sensory benefit, automation and economics still need future evidence.
**Decisions to sanity-check:** Foodservice first; tomatoes and cooked sauces; market uncommitted; private operator recipes and licensed platform recipes.

Your next move: Read the PRD and its validation gates. Product implementation requires a separate authorized plan; this document does not start it. Full documentation detail follows below.

---

> TL;DR (machine): Medium effort; Medium risk; complete business/product PRD with documentation QA and required plan review.

## Scope
### Affected user and ideal state
<!-- From the draft ledger: who this touches and how they use the result, then one IS row per property with its reason, then one GAP row per difference with its reason. Every todo below closes a GAP row; ## Success criteria proves every IS row. -->
**Affected user:** The founder and future product team need a complete PRD for a produce-data, robotics and foodservice business. Quality, kitchen, purchasing, safety, commercial and delivery operators need traceable responsibilities and testable requirements. The deliverable here is documentation; no product implementation or physical validation is authorized.

| Row | Statement | Reason |
| --- | --- | --- |
| IS-1 | Founder and product team share goals, boundaries, dependencies and acceptance criteria | Prevent incompatible business and development assumptions |
| IS-2 | Quality operators retain attributes, provenance, uncertainty and sampling scope | Make variation observable without unsupported claims |
| IS-3 | Robotics operators preserve identity and reconcile physical inventory | Avoid incorrect routing and silent quantity loss |
| IS-4 | Chefs and kitchen workers use bounded recipes tied to a sensory target | Test finished-food consistency and usability |
| IS-5 | Purchasing and commercial stakeholders see measurable value and explicit recipe rights | Support a sustainable, permission-based offering |
| IS-6 | Brand operators and consumers receive a traceable product validated at consumption | Extend consistency through delivery and complaints |
| IS-7 | Accountable safety staff retain disposition authority independently of flavor decisions | Prevent quality optimization from bypassing release constraints |
| GAP-1 | Original concept lacked an initial buyer/use case | Resolved direction: foodservice operators and tomato sauces |
| GAP-2 | Market, budget, capacity, methods and technology remain uncommitted | Explicit future authorization and evidence gates prevent invented commitments |
| GAP-3 | No measurement, sensory or automation baseline exists | Specify experiments without claiming validation |
| GAP-4 | No PRD existed before this work | Deliver the complete readable requirements artifact |
| GAP-5 | Recipe rights and commercialization requirements were undefined | Direction resolved to private operator and licensed platform recipes; document required controls |

### Must have
- Primary deliverable: `.omo/drafts/produce-quality-prd-document.md`, a standalone English PRD.
- Preserve all six requested components: measurement, classification, robotic sorting/inventory, adaptive recipes, commercialization, and own brand/delivery.
- Preserve approved choices: foodservice buyers; tomato sauces; no assumed launch market; private operator recipes and licensed platform-authored recipes.
- Include users, goals, workflows, numbered functional/nonfunctional requirements, data lifecycle, business hypotheses, metrics, acceptance gates, dependency roadmap, exceptions and risks.
- Cover seven ideal-state rows, including purchasing, consumer and accountable safety outcomes.
- Keep future product-validation protocols separate from document completion checks.
- Planning state and review receipts remain in `.omo/drafts/produce-quality-prd.md`; review evidence remains under `.omo/evidence/`.
### Must NOT have (guardrails, anti-slop, scope boundaries)
- No product code, infrastructure, hardware operation or procurement.
- No invented scientific results, revenue, market size, prices, capacity or legal conclusions.
- No assumption that vision directly measures chemistry, that a lot average describes each item, or that one score proves taste.
- No public recipe marketplace or private-data training rights without a future explicit decision.
- No git commit, settings changes, deployment or spending.
- Do not overwrite unrelated workspace files.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after. Use `functions.eval` with Bun text reads for structural assertions, then agent-executed semantic scenario review. No software test framework is required for a Markdown PRD.
- Structural invocation: `await Bun.file(".omo/drafts/produce-quality-prd-document.md").text()` and equivalent plan read in a JS eval cell; assert numbered requirement uniqueness, section presence, task grammar, category annotations and dependency coverage.
- Semantic invocation: `functions.read` on the full PRD, followed by a written evidence matrix comparing each requirement and exception to the approved scope. Phrase matching alone cannot pass semantic review.
- Evidence: `.omo/evidence/produce-quality-prd-qa.md`, containing per-task happy/failure conclusions, final-verifier conclusions, commands and limitations.
- Review: mandatory plan-consultant gap analysis, then native plan-reviewer of this exact complete plan. Record digest-bound receipts in the planning draft. Review approval and physical-product readiness are different claims.
- Physical trials are future requirements with accountable roles and frozen protocols in PRD Sections 10-15; none can be passed by document inspection.

## Execution strategy
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
Wave A: five focused documentation tasks. Task 1 establishes the agreed scope; tasks 2-4 specify independent subject areas against that scope; task 5 integrates their gates and evidence. Because their outputs share one PRD file, a single writer applies edits sequentially. Read-only analysis can run alongside drafting.

Wave B: four final document verifiers after tasks 1-5. These assess the document, not an implemented system. The parent performs local QA; one native plan-reviewer supplies the required independent plan review. A completed PRD needs no software execution command.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 | None | 2, 3, 4, 5 | Read-only evidence collection |
| 2 | 1 | 5 | Analysis for 3 and 4; shared-file edits serialized |
| 3 | 1 | 5 | Analysis for 2 and 4; shared-file edits serialized |
| 4 | 1 | 5 | Analysis for 2 and 3; shared-file edits serialized |
| 5 | 1, 2, 3, 4 | F1, F2, F3, F4 | None |
| F1-F4 | 1, 2, 3, 4, 5 | Documentation handoff | Read-only checks may run together |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Define product direction users and outcomes
  Recommended task executor category: writing - turn approved business choices into explicit PRD scope.
  What to do / Must NOT do: Write PRD Sections 1-5, capturing the complete vision, initial customer/use case, goals, users and workflow. Do not change approved choices or invent market demand.
  Closes: GAP-1, GAP-4.
  Parallelization: Wave A | Blocked by: none | Blocks: 2, 3, 4, 5.
  References: `.omo/drafts/produce-quality-prd.md`, Decisions and Approval gate; original user business description; PRD Sections 1-5.
  Acceptance criteria: Full-text agent review confirms every component and all four approved choices, purchasing stakeholders, end consumers and safety roles are represented.
  QA scenarios: Happy - `functions.read` PRD Sections 1-5 and map each approved choice to its operative statement. Failure - challenge a reading that assumes an own-brand-first or U.S.-only business; the text must reject both assumptions. Evidence: `.omo/evidence/produce-quality-prd-qa.md#task-1`.
  Commit: N - no commit authorized.

- [ ] 2. Specify measurement classification and physical traceability
  Recommended task executor category: writing - document distinct scientific and operational contracts.
  What to do / Must NOT do: Write FR-01 through FR-17 and supporting information-model requirements. Distinguish measurement, prediction, sample scope, physical command and physical outcome. Do not claim validated sensing.
  Closes: GAP-3, GAP-4.
  Parallelization: Wave A | Blocked by: 1 | Blocks: 5.
  References: PRD Sections 6.1-6.3, 7, 10-12; `.omo/drafts/produce-quality-prd.md`, verified NIST finding and detail-design advisory.
  Acceptance criteria: Observations carry method/unit/provenance/uncertainty; classification can abstain; routing preserves identity; all quantity-changing operations reconcile.
  QA scenarios: Happy - `functions.read` the specified sections and trace a measured lot through routing into inventory. Failure - trace a heterogeneous sampled lot, expired calibration, lost identity and duplicate movement; each must produce an explicit restriction or reconciliation requirement. Evidence: `.omo/evidence/produce-quality-prd-qa.md#task-2`.
  Commit: N - no commit authorized.

- [ ] 3. Specify adaptive recipes and licensed commercialization
  Recommended task executor category: writing - connect culinary constraints, customer rights and business workflows.
  What to do / Must NOT do: Write FR-18 through FR-29, recipe data contracts and separate foodservice economics. Specify bounded adaptation, immutable production versions, tenant rights and training consent. Do not introduce a public creator marketplace.
  Closes: GAP-3, GAP-4, GAP-5.
  Parallelization: Wave A | Blocked by: 1 | Blocks: 5.
  References: Approved private/licensed model in `.omo/drafts/produce-quality-prd.md`; PRD Sections 6.4-6.5, 7, 9-12.
  Acceptance criteria: A reader can distinguish licensing from ownership and data-training consent, and can identify the fixed-recipe comparator, sensory target and adaptation-unavailable state.
  QA scenarios: Happy - `functions.read` these sections and trace permitted adaptation followed by licensed recipe use. Failure - assess missing decisive data, forbidden substitution, cross-tenant access and revoked rights; none may silently issue approved instructions or expose private content. Evidence: `.omo/evidence/produce-quality-prd-qa.md#task-3`.
  Commit: N - no commit authorized.

- [ ] 4. Define brand delivery and accountable operating boundaries
  Recommended task executor category: writing - preserve the long-term business without inventing operating commitments.
  What to do / Must NOT do: Write FR-30 through FR-34 and NFR-01 through NFR-08; specify brand/delivery lineage, complaints, holds and distinct safety authority. Do not assume a courier fleet or selected jurisdiction.
  Closes: GAP-2, GAP-4.
  Parallelization: Wave A | Blocked by: 1 | Blocks: 5.
  References: Original own-brand/delivery goal; PRD Sections 4, 6.6, 7-8, 11-15.
  Acceptance criteria: Ingredient-to-order and reverse traceability, connectivity exceptions, tenant protection, delivery quality and jurisdiction gates are explicit.
  QA scenarios: Happy - `functions.read` the specified sections and trace a branded order to ingredient lineage and customer feedback. Failure - evaluate withdrawn input, delivery excursion, network loss and safety hold; document who controls disposition and why flavor approval cannot override it. Evidence: `.omo/evidence/produce-quality-prd-qa.md#task-4`.
  Commit: N - no commit authorized.

- [ ] 5. Integrate metrics experiments risks and release gates
  Recommended task executor category: writing - consolidate a complete PRD with evidence boundaries.
  What to do / Must NOT do: Complete PRD Sections 9-16 and requirement-to-user QA evidence. Resolve consultant gaps, preserve owner choices and specify future decision owners. Leave thresholds uncommitted only as explicit pre-evaluation gates. Do not claim physical trials ran.
  Closes: GAP-1, GAP-2, GAP-3, GAP-4, GAP-5.
  Parallelization: Wave A | Blocked by: 1, 2, 3, 4 | Blocks: F1-F4.
  References: Complete PRD; planning draft; consultant receipt st_01a1d9fa; detail advisory st_01a1d9ee; NIST Technical Note 2156 Sections 3.1-3.2.
  Acceptance criteria: Unique FR-01..FR-34 and NFR-01..NFR-08; all six components and seven ideal-state rows map to requirements and scenarios; V1..V7 distinguish proposed trials from completed documentation.
  QA scenarios: Happy - `functions.eval` reads Markdown and checks IDs/structure, followed by `functions.read` for semantic mapping. Failure - inspect for unsupported numerical promises, post-hoc thresholds, hidden market commitments or language implying completed validation; reject or correct each instance. Evidence: `.omo/evidence/produce-quality-prd-qa.md#task-5`.
  Commit: N - no commit authorized.

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
  Verify the complete PRD against the approved six components and four owner choices using `functions.read`; record approve/findings in `.omo/evidence/produce-quality-prd-qa.md#f1`. Challenge accidental scope substitutions.
- [ ] F2. Code quality review
  Documentation-only interpretation: review clarity, internal consistency, requirement IDs, dependencies and absence of scaffolding placeholders with `functions.eval` and full-text review. No product code exists or was changed. Evidence: `.omo/evidence/produce-quality-prd-qa.md#f2`.
- [ ] F3. Real manual QA
  Agent performs the scenario walkthroughs against the actual Markdown artifact: normal lot-to-dish, expired measurement, lost identity, prohibited recipe change, private content, and delivery hold. No physical operation is claimed. Evidence: `.omo/evidence/produce-quality-prd-qa.md#f3`.
- [ ] F4. Ideal-state fidelity
  Map IS-1 through IS-7 to concrete PRD requirements and the corresponding normal/failure scenarios. An unmapped row fails the document review. Evidence: `.omo/evidence/produce-quality-prd-qa.md#f4`.

## Commit strategy
No git operations or commits are authorized. All deliverables remain under `.omo/`. The workspace began without product files; no existing implementation can be tested.

## Success criteria
> One row per IS row. The plan is complete only when every IS row has a delivering todo and a proving QA scenario; F4 checks the delivered behavior against these rows 1:1, and a shortfall becomes new `- [ ] N.` rows, never a note.
| IS | Delivering todo(s) | Proving QA scenario | Evidence |
| --- | --- | --- | --- |
| IS-1 | 1, 5 | Scope and complete requirement coverage | `.omo/evidence/produce-quality-prd-qa.md#task-1` |
| IS-2 | 2 | Heterogeneous lot and expired calibration | `.omo/evidence/produce-quality-prd-qa.md#task-2` |
| IS-3 | 2 | Lost identity and duplicate movement | `.omo/evidence/produce-quality-prd-qa.md#task-2` |
| IS-4 | 3 | Bounded adaptation and forbidden substitution | `.omo/evidence/produce-quality-prd-qa.md#task-3` |
| IS-5 | 3, 5 | Private/licensed rights and economic hypotheses | `.omo/evidence/produce-quality-prd-qa.md#task-3` |
| IS-6 | 4 | Branded order lineage and delivery hold | `.omo/evidence/produce-quality-prd-qa.md#task-4` |
| IS-7 | 3, 4 | Safety disposition independent of flavor | `.omo/evidence/produce-quality-prd-qa.md#f4` |
