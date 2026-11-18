# Product Requirements Document: Produce Intelligence and Adaptive Foodservice

Version: 1.0  
Date: November 14, 2026  
Status: Proposed product requirements; not evidence of product or commercial validation  
Primary customer: Foodservice operators, including restaurants and central kitchens  
Initial application: Tomato-based cooked sauces  
Launch market: Uncommitted  
Recipe business model: Private operator recipes and licensed platform-authored recipes

## 1. Executive summary

Build a platform that connects agricultural ingredient characteristics to repeatable food preparation. The platform captures produce measurements and provenance, classifies suitability for specific uses, supports robotic sorting and inventory management, and adapts approved recipes to the characteristics of available ingredients.

The first customer is a foodservice operator preparing tomato-based cooked sauces. The operator should be able to receive variable tomato lots, understand the measured variation, assign ingredients to a suitable preparation, and produce a dish closer to an approved flavor target than a fixed recipe achieves under the same conditions.

The long-term business extends this capability into recipe licensing, a distinct food brand, and food delivery. All six capabilities remain part of the product vision. Their release depends on evidence from measurement, culinary, operational, commercial, and delivery validation.

The core product promise is **ingredient-aware cooking with measurable consistency**. The platform must demonstrate that promise through finished-food outcomes rather than treating a produce score or model prediction as sufficient proof.

## 2. Problem and opportunity

The founder identifies a recurring problem: produce of the same cultivar can vary with origin, growing conditions, harvest timing, ripeness, and handling. Foodservice teams often compensate using experience, while a fixed recipe does not explicitly account for ingredient differences.

The business hypothesis is that connecting ingredient observations to preparation decisions can reduce variation, rework, waste, and dependence on individual operator judgment. The further hypothesis is that the resulting recipe and operating data can support licensing and a differentiated food brand. Neither hypothesis is represented here as validated market demand.

The product must answer four questions:

1. What do we know about this ingredient, and how reliable is that knowledge?
2. Which use and preparation are appropriate for this ingredient?
3. Did the resulting food meet the intended quality and sensory target?
4. Did the process deliver enough operational and economic value to justify its cost?

## 3. Product goals and boundaries

| Goal | Desired outcome | Proof required |
| --- | --- | --- |
| G1: Make ingredient variation observable | Operators can distinguish attributes, provenance, uncertainty, and sample scope | Measurement and traceability evaluation |
| G2: Improve consistency | Adaptive preparation reduces variation against a fixed-recipe baseline without unacceptable loss of liking | Independent cooking batches and blinded sensory comparison |
| G3: Support dependable automation | Sorting preserves identity, routes correctly, and avoids unacceptable damage | Physical throughput, routing, identity, and damage tests |
| G4: Improve operating economics | Benefits exceed measurement, handling, automation, service, and support costs | Pilot cost accounting and customer willingness-to-pay evidence |
| G5: Commercialize recipes responsibly | Private knowledge stays private and licensed content has explicit rights | Access, license, publication, and revocation scenarios |
| G6: Establish a reproducible brand | Product quality survives preparation, packaging, transport, and consumption conditions | Brand and delivery validation |

This PRD does not authorize procurement, select a technology stack, commit a launch country, establish a funding amount, or promise universal performance across crops. It does not define an all-purpose taste score, assume computer vision directly measures chemistry, or equate culinary quality with food safety. Autonomous cooking beyond approved recipe execution is outside the stated product scope.

## 4. Users and responsibilities

| User | Current need | Product-supported outcome |
| --- | --- | --- |
| Foodservice owner or operations manager | Consistent output and acceptable margins | Compare quality, labor, waste, and cost across batches and sites |
| Receiving and quality operator | Decide how incoming produce can be used | Capture lots, inspect samples, review attributes, and release or hold inventory |
| Robotics operator | Move ingredients reliably | Monitor routing, identity, damage, equipment state, and exceptions |
| Chef or recipe developer | Translate variable ingredients into a target dish | Author bounded adaptations, run trials, and approve recipe versions |
| Kitchen production worker | Execute understandable instructions | Receive exact quantities and steps with an approved status |
| Supplier or grower partner | Understand acceptance and feedback | Share permitted provenance and see agreed quality feedback |
| Platform administrator | Protect operational and commercial data | Manage organizations, permissions, audit history, and device access |
| Brand and delivery operator | Maintain the promised eating experience | Link ingredient lots to production, packaging, dispatch, and feedback |
| End consumer | Receive a satisfying and consistent meal | Experience the validated product promise and provide feedback |

Measurement, culinary, robotics, food safety, and commercial approval are distinct responsibilities. One person may hold several roles in a pilot, but the approval record must identify the role exercised.

## 5. End-to-end workflow

1. **Receive:** Create a traceable lot with supplier, crop, cultivar when known, quantity, arrival condition, and available harvest/storage history. Unknown information stays explicitly unknown.
2. **Inspect and measure:** Assign samples or items, capture instrument readings and images, and attach method, calibration status, timestamps, units, and evidence.
3. **Classify:** Evaluate suitability against a versioned, crop-specific rule or validated model. Show the basis and confidence. Separate culinary assignment from safety or disposition approval.
4. **Sort and reconcile:** Issue routing commands, confirm physical outcomes, preserve item-to-bin identity, and reconcile quantities. Hold unresolved items.
5. **Plan production:** Choose an approved recipe and target output. Reserve eligible inventory and produce a bounded adaptation proposal.
6. **Approve and cook:** Present exact instructions and changes from the base recipe. Record operator approval where required, actual quantities, equipment, times, yield, deviations, and finished-food observations.
7. **Evaluate:** Compare output with the sensory target and baseline; relate results to input lots and recipe versions.
8. **Commercialize:** Keep operator recipes private; license eligible platform-authored versions under explicit terms.
9. **Extend to brand and delivery:** Attach product specification, packaging, dispatch, arrival condition, and customer feedback to the production record.

Example: Two tomato lots may need different approved sauce preparations. The system proposes adjustments only within a tested range. If decisive attributes are missing or outside that range, it withholds automatic adaptation and sends the batch for assessment. This is an illustrative workflow, not a validated recipe.

## 6. Functional requirements

All requirements below belong to the complete product vision. Dependencies in Section 13 determine when each capability can be released; no requirement is silently removed from scope.

### 6.1 Produce intake and measurement

| ID | Requirement | Observable acceptance condition |
| --- | --- | --- |
| FR-01 | Create organization-scoped suppliers, produce lots, samples, and optional item identities | An authorized user can trace a measurement back to its lot; another organization cannot retrieve it |
| FR-02 | Capture cultivar, origin, growing/harvest/storage history when supplied, arrival time, quantity, and condition | Missing provenance remains marked unknown and is never fabricated |
| FR-03 | Record attribute value, unit, basis, method, sample scope, timestamp, device/operator, calibration status, uncertainty, and evidence type | An incomplete or incompatible record cannot silently become an approved measurement |
| FR-04 | Support soluble-solids readings, separately identified sugar assays, pH, titratable acidity, mass/dimensions, color, firmness, and ripeness observations as applicable | Each property retains its own method and units; the interface distinguishes proposed estimates from measured results |
| FR-05 | Link images and model estimates to reference records and model versions | A reviewer can identify the source observation and tested operating domain behind a prediction |
| FR-06 | Distinguish valid, missing, invalid, expired, and outside-validated-domain inputs | Missing values do not become zero; expired or invalid decisive inputs prevent automatic release |

For the proposed measurement contract, a refractometer result is labeled soluble solids in degrees Brix rather than automatically labeled sugar concentration. pH and titratable acidity use separate fields. Visual maturity, culinary readiness, and predicted readiness at consumption are separate concepts. These are product design requirements to validate with qualified domain owners.

### 6.2 Classification and quality intelligence

| ID | Requirement | Observable acceptance condition |
| --- | --- | --- |
| FR-07 | Define versioned, commodity-specific specifications for intended uses | The same lot can have different suitability results for distinct recipe uses without changing its observations |
| FR-08 | Preserve attribute-level results alongside any composite grade | Operators can inspect why a classification occurred; a grade never erases conflicting attributes |
| FR-09 | Apply explicit decision rules to uncertainty and lot sampling | Ambiguous boundary cases enter review; a sampled lot result is not presented as a measurement of every item |
| FR-10 | Record overrides with identity, reason, timestamp, and affected scope | The original decision remains auditable and an override cannot bypass a separate safety hold |
| FR-11 | Monitor model error, data drift, acceptance coverage, and operating-domain changes | A failed monitoring gate suspends the affected automated decision version and identifies impacted inventory |

### 6.3 Robotics and inventory

| ID | Requirement | Observable acceptance condition |
| --- | --- | --- |
| FR-12 | Associate sensing results, routing decisions, physical items or containers, and destination bins | A test item is traceable through the line; a broken identity link results in a hold rather than an assumed match |
| FR-13 | Track command, acknowledgement, physical outcome, failure, and recovery states | Duplicate or replayed commands cannot silently produce duplicate inventory movement |
| FR-14 | Detect and handle occlusion, ambiguous detections, failed grasps, jams, disconnected equipment, and unconfirmed routing | Unresolved produce enters a designated hold path; recovery requires reconciliation before automatic restart |
| FR-15 | Reconcile received, sampled/destructively tested, sorted, damaged, reserved, consumed, transferred, and disposed quantities | Quantity discrepancies remain visible; consumed or held stock cannot be reserved as available |
| FR-16 | Record storage state, transfers, split/merge lineage, and reinspection needs | Blended or split lots retain their parent relationships and appropriate status constraints |
| FR-17 | Respect local equipment interlocks, emergency stopping, and approved hygienic operating procedures | Software cannot override a required physical stop or sanitation release |

The platform may supervise sorting; the actual protective functions and safe equipment design require qualified engineering approval. A screen status is not proof of a physical stop.

### 6.4 Adaptive recipes and production

| ID | Requirement | Observable acceptance condition |
| --- | --- | --- |
| FR-18 | Version recipes with ingredient masses, preparation state, equipment, servings/yield, process steps, target attributes, and validated operating envelope | Every production batch resolves to an immutable recipe version |
| FR-19 | Define permitted adaptation variables and limits for each recipe | Suggested quantities and process changes remain inside approved ranges and show their rationale |
| FR-20 | Block automatic adaptation for decisive missing inputs, infeasible constraints, or unsupported domains | The system returns an explicit unavailable/review status rather than inventing a correction |
| FR-21 | Preserve approved allergen, ingredient substitution, process, and other food safety constraints | A disallowed change cannot be issued as an approved recipe; quality optimization cannot release a safety hold |
| FR-22 | Provide execution-ready instructions with units, quantities, equipment, order, timing, and approval state | Two operators receive the same version and instructions for identical approved inputs |
| FR-23 | Record actual execution, substitutions, deviations, yields, rework, and finished-food observations | A deviation remains linked to the affected batch and cannot silently rewrite the approved recipe |
| FR-24 | Compare adaptive and fixed-recipe outcomes using predeclared quality and sensory endpoints | Reports separate measured finished-food properties, perceived intensity, preference, and liking |

Recipe adjustments are proposals until their operating envelope and process constraints are approved. A sensory target is defined for a customer and use case; preference is not assumed universal.

### 6.5 Commercialization and rights

| ID | Requirement | Observable acceptance condition |
| --- | --- | --- |
| FR-25 | Keep operator recipes private by default with organization and role permissions | Another customer cannot search, export, infer through reporting, or execute a private recipe |
| FR-26 | License platform-authored recipes using explicit version, scope, entitlement, attribution, and commercial terms | An unentitled account cannot obtain a usable licensed recipe |
| FR-27 | Require explicit permission for publication, sharing, derivative use, and use of customer data for model training | No such use occurs merely because data was uploaded |
| FR-28 | Preserve historical production evidence when rights or access change | Revocation blocks prohibited future use while retaining restricted audit records needed for past production |
| FR-29 | Support auditable entitlements and commercial usage records | Duplicate usage events do not create duplicate billable events; disputed usage can be reconstructed |

An open creator marketplace, public recipe feed, and creator revenue-sharing system are not assumed in the selected model. Future introduction requires a separate product and rights decision.

### 6.6 Brand and delivery

| ID | Requirement | Observable acceptance condition |
| --- | --- | --- |
| FR-30 | Define a versioned branded product specification derived from validated recipes | A branded batch identifies its target quality, preparation, packaging, and permitted holding conditions |
| FR-31 | Connect orders to production batches, ingredient lineage, packaging, and dispatch events | An order can be traced to contributing ingredient lots and affected orders can be identified in reverse |
| FR-32 | Capture delivery condition, service exceptions, and consented customer feedback | Reports separate cooking failure, packaging failure, delivery failure, and preference |
| FR-33 | Prevent release outside approved operating or delivery conditions | A failed release gate produces an actionable hold or cancellation state rather than a false ready status |
| FR-34 | Link withdrawals, complaints, and corrective actions to affected lots, recipes, batches, and orders | A traceability exercise identifies affected inventory and orders without exposing unrelated customer data |

The platform must support delivery integration; operating an independent courier fleet is not required by the current brief. Courier selection, geographic coverage, menu, pricing, and consumer promise require evidence before launch.

## 7. Information model and lifecycle

| Entity | Minimum content | Key relationships |
| --- | --- | --- |
| Organization and role | Identity, tenant, permissions, approvals | Owns private data and authorized actions |
| Produce lot | Crop, supplier, provenance, quantity, status | Parent/child lots, samples, inventory movements |
| Sample or item | Identity, lot, collection and preparation details | Observations and routing events |
| Observation | Attribute, value/unit/basis, time, method, evidence, uncertainty | Device/calibration or model version |
| Quality decision | Specification version, inputs, result, rationale, review state | Lot/item, intended use, override |
| Device and model | Version, status, calibration/validation scope | Observations, monitoring and suspension |
| Inventory movement | Source, destination, quantity, unit, event identity | Physical routing and reconciliation |
| Recipe and adaptation | Ownership, version, bounds, targets, input snapshot | License and production batch |
| Production batch | Reserved/consumed inputs, recipe, actual execution, yield | Finished observations, packaging, orders |
| License and usage | Rights, account, content version, event identity | Authorized access and billing |
| Order and delivery | Product/batch, dispatch, condition, feedback | Consumer data and traceability |
| Audit event | Actor, action, timestamp, reason, affected versions | All controlled changes |

Use immutable histories for observations, decisions, recipes, and production evidence. Corrections supersede records rather than erasing the original. Preserve quantity units, conversions, timestamps, and sampling scope. Apply tenant isolation consistently to files, images, reports, exports, and integrations.

Retention periods, privacy rights, data residency, and required records must be approved for the eventual jurisdiction and contracts. Deletion or anonymization must reconcile privacy obligations with required production and commercial evidence. A documented policy must exist before live customer data collection.

Authorized organizations must be able to export their permitted observations, recipes and production records in a documented machine-readable format. Export must respect third-party recipe licenses and must not include another tenant's data. Deletion, retention exceptions, license expiry and derived-data permissions require explicit policy and auditable enforcement.

## 8. Nonfunctional requirements

| ID | Requirement | Release evidence |
| --- | --- | --- |
| NFR-01 | Enforce tenant isolation, least-privilege roles, authenticated devices, protected transport/storage, and auditable privileged actions | Negative authorization and device-access tests |
| NFR-02 | Preserve atomic inventory effects and recoverable event processing | Duplicate, delayed, reordered, and interrupted event scenarios |
| NFR-03 | Expose stale data and disconnected equipment; retain locally approved stop controls | Connectivity-loss and resynchronization scenarios without unapproved material release |
| NFR-04 | Support operator-readable units, clear status/reasons, and accessible critical workflows | Task-based operator evaluation and accessibility checks |
| NFR-05 | Record model/specification versions, evaluation data boundaries, and monitoring decisions | Reconstruct a historical classification and adaptation |
| NFR-06 | Set capacity, latency, availability, recovery, and data-loss objectives for the chosen pilot | Measured tests at the declared workload with preapproved thresholds |
| NFR-07 | Provide restore procedures and controlled rollback of models, rules, and recipes | Recovery exercise preserving audit history and stock state |
| NFR-08 | Make third-party integrations replaceable at defined data boundaries | Contract and failure tests for measurement, robotics, inventory, and delivery interfaces |

This PRD deliberately makes no unsupported numerical capacity or uptime promise. Before each evaluation, the relevant owner must freeze the workload, target values, and pass/fail rules; results cannot be used to choose easier thresholds afterward.

## 9. Business model and economics

The initial value proposition is improved recipe consistency and operating visibility for foodservice operators. Candidate revenue mechanisms are platform subscriptions, implementation/integration fees, measurement or automation services, and platform-recipe licensing. These are monetization hypotheses to evaluate, not approved pricing.

Track the full operating cost: sampling and destroyed produce, instrument calibration, sensors, robotics, maintenance, sanitation, labor, cloud/software, recipe development, validation, implementation, support, and service downtime.

Customer value should be evaluated as avoided waste and rework plus labor or yield improvements, less the complete incremental operating cost. Do not count a labor saving that merely moves work to sampling or exception handling.

For the later food brand, evaluate contribution per order after ingredients, production labor, packaging, delivery, platform/channel fees, refunds, and spoilage. Avoid double-counting internal recipe licenses as external revenue.

Commercial gates require customer discovery, measured willingness to pay, pilot conversion evidence, and a defensible cost-to-serve model. No market size, revenue forecast, pricing point, or investment return is asserted.

## 10. Metrics and evaluation definitions

| Metric | Definition | Guardrail |
| --- | --- | --- |
| Measurement validity | Usable observations / attempted observations | Report invalid, missing, and expired observations separately |
| Prediction performance | Bias/error and uncertainty coverage by declared operating domain | Evaluate independent lots and conditions; no duplicate-item train/test leakage |
| Decision coverage | Accepted automated decisions / all eligible attempted items | Report accuracy alongside abstentions and failures |
| Effective sorting throughput | Correctly routed, acceptable items / elapsed operating time | Include stoppages and reject unacceptable damage |
| Identity integrity | Correctly linked physical outcomes / tested movements | An unknown outcome is not counted as correct |
| Inventory discrepancy | Unexplained quantity difference against reconciled physical stock | Include sample destruction, disposal, splits and blends |
| Finished-food consistency | Predeclared variation in target sensory/physical endpoints across independent cooking batches | Compare against the same fixed-recipe baseline conditions |
| Consumer or panel liking | Blinded assessment of the defined dish and population | Consistency improvement must not hide unacceptable liking loss |
| Waste and rework | Disposed or reworked edible mass / handled edible mass | Distinguish unavoidable sampling from preventable waste |
| Operator burden | Active labor and exception time per acceptable batch | Include setup, cleaning, measurement, and recovery |
| Customer economics | Measured benefit minus complete incremental cost | Report assumptions and cost allocation |
| Delivery quality | Orders meeting approved arrival/consumption conditions / dispatched eligible orders | Include cancellations and failed deliveries explicitly |

Every evaluation protocol must name its owner, population, baseline, unit of analysis, independent replication, primary endpoint, meaningful improvement, permitted trade-off, sample-size rationale, confidence rule, and frozen threshold values. An incomplete protocol means evaluation has not started; it does not imply acceptance.

## 11. Validation program and acceptance gates

| Gate | Required work | Pass evidence | Failure response |
| --- | --- | --- | --- |
| V1: Problem and demand | Observe foodservice workflows and document baseline variation, workarounds, costs, and buying process | Recorded evidence supporting a defined customer problem and paid-pilot hypothesis | Revise proposition and pilot design before build commitments |
| V2: Measurement | Pair identified samples with approved reference procedures; evaluate repeatability and between-operator/device reproducibility across intended tomato conditions | Frozen tolerance and uncertainty criteria satisfied on independent evaluation data | Restrict domain, change method, or retain manual assessment |
| V3: Classification | Evaluate use-specific decisions including missing inputs and boundary cases | Accuracy, decision coverage, and uncertainty rules all pass | Suspend the affected automatic decision |
| V4: Robotics | Exercise routing, identity, damage, timing, cleaning constraints, and fault recovery at the declared workload | Physical evidence and reconciled inventory meet all frozen criteria | Return to controlled operation; do not claim production automation |
| V5: Adaptive sauce | Randomize matched ingredient batches between fixed and adaptive preparation; blind and balance sensory assessment | Required consistency improvement and permitted liking trade-off both pass | Revise adaptation or restrict the operating envelope |
| V6: Commercial operation | Evaluate private data protection, recipe entitlement, billing events, cost-to-serve, and willingness to pay | Rights/security scenarios pass and commercial evidence supports the offering | Restrict access and revisit the commercial proposition |
| V7: Brand and delivery | Validate recipes, packaging, holding/transit conditions, traceability, customer response, and order economics | Product promise and approved operating constraints pass at the claimed conditions | Withhold the affected branded offering |

V2-V5 must include heterogeneous lots, matching chemistry with different sensory outcomes, unsupported produce conditions, missing decisive data, mixed/split lots, and failed physical identity. Product trials involve physical work and qualified approvals; they have not been executed by writing this PRD.

Quality validation cannot release food for use when a safety process rejects it. Applicable food handling, allergens, sanitation, worker/machine safety, consumer claims, labeling, traceability, privacy, and commercial requirements must be determined for the selected market and operating model.

## 12. Critical exception scenarios

| Scenario | Required behavior |
| --- | --- |
| Lot average meets specification but some items do not | Preserve sampling limits and heterogeneity; do not assert individual conformity |
| Two lots have similar measured attributes but different aroma or texture | Retain finished-food evaluation and withhold unsupported equivalence claims |
| Model sees an unvalidated cultivar, season, device or storage condition | Mark outside validated domain and route to review |
| Device calibration expires or readings become stale | Mark affected results unusable for automatic decisions and identify downstream dependencies |
| Routing acknowledgement arrives twice or out of order | Reconcile physical outcome and inventory once without duplicate effects |
| Robot moves an item but identity is lost | Hold the affected material and reconcile before reuse |
| Inventory changes after recipe adaptation | Recheck the reserved input snapshot before release; require regeneration or review if invalid |
| Kitchen substitutes an ingredient | Reassess approved bounds, allergens, and process constraints before issuing approved instructions |
| Private recipe access is revoked | Block prohibited future use while retaining restricted historical production evidence |
| A lot is withdrawn after dispatch | Find linked stock, batches and orders; support controlled action and communication by authorized operators |
| Connectivity or power fails during production | Preserve approved local stop behavior, identify uncertain actions, and reconcile before restart |
| Delivery exceeds approved conditions | Flag or hold/cancel the affected order under an approved operating procedure |

## 13. Dependency-based roadmap

These stages sequence the entire vision; they are evidence gates rather than calendar promises or authorization to implement.

Before a physical or paid pilot, obtain named accountable owners, an approved budget ceiling, target capacity, a frozen evaluation protocol and safety approval. Select hardware and software only after workload, identity contracts and integration constraints are established. Expansion to additional crops, markets, capacity or branded products requires separate evidence and authorization rather than automatic inheritance of pilot results.

| Stage | Outcome | Entry/dependency | Exit |
| --- | --- | --- | --- |
| A: Customer and measurement foundation | Defined foodservice problem, tomato use case, reference methods, data contract and pilot protocol | Approved product direction and study resources | V1 and approved V2 protocol |
| B: Ingredient-aware sauce workflow | Measured lots, suitability, inventory, versioned recipes and controlled cooking evidence | Reliable measurements and operator workflow | V2, V3 and V5 |
| C: Physical automation | Vision-assisted sorting integrated with material identity and inventory | Traceable sensing and qualified equipment design | V4 plus approved operating procedures |
| D: Commercial foodservice platform | Repeatable onboarding, private recipes, licensed content, support and sustainable service economics | Validated workflow; robot claims require Stage C | V6 and relevant pilot acceptance |
| E: Food brand and delivery | Validated branded products and order-to-ingredient traceability | Proven recipes and approved production/packaging/delivery processes | V7 and jurisdiction-specific launch approval |

Commercial service need not claim robotics until physical automation passes its gate. The ultimate brand and delivery offering remains a required strategic destination, with its own evidence and authorization.

## 14. Risks and mitigations

| Risk | Consequence | Required mitigation |
| --- | --- | --- |
| Attributes do not adequately explain sensory outcomes | Recipe predictions overpromise consistency | Evaluate finished food; expand observations only when evidence supports value |
| Sampling misses internal lot variation | Incorrect suitability and inconsistent batches | Document sampling scope and evaluate heterogeneous lots |
| Cross-season or supplier drift | Degraded model decisions | Independent domain evaluation, monitoring, and suspension |
| Automation damages produce or costs more than it saves | Poor yield and economics | Measure acceptable throughput, delayed damage, maintenance and total labor |
| Ingredient changes invalidate cooking constraints | Unsafe or unsuitable output | Bounded, approved adaptations and separate release controls |
| Recipes or customer data are exposed | Commercial harm and loss of trust | Tenant isolation, explicit rights, minimal access, and auditability |
| Customer workflow burden exceeds benefit | Low adoption and renewal | Measure full operator burden and buying willingness |
| Delivery erodes validated kitchen quality | Brand inconsistency | Arrival-condition and consumption-window testing |
| Too many business layers obscure accountability | Expensive expansion without proven value | Explicit stage owners, economics and evidence gates |

## 15. Decisions and launch prerequisites

The owner has selected foodservice customers, a tomato-sauce initial application, a market-neutral PRD, and private/licensed recipes. These are document assumptions to preserve unless explicitly changed.

| Required decision | Accountable role | Must be resolved before |
| --- | --- | --- |
| Pilot customer, kitchen process and acceptance baseline | Founder/product lead | V1 protocol approval |
| Launch jurisdiction and operating model | Business and qualified compliance owners | Live commercial launch |
| Funding envelope, pricing hypothesis and procurement authority | Founder/finance | Paid commitments or equipment procurement |
| Capacity, latency, availability and recovery objectives | Product/operations | Frozen evaluation and equipment selection |
| Reference methods, sampling plan and tolerances | Quality/metrology | V2 |
| Taste target, adaptation limits and sensory protocol | Culinary/sensory | V5 |
| Equipment, safety design, sanitation and operating procedures | Robotics/operations and qualified safety owners | V4 or live equipment operation |
| Data ownership, retention, licenses and permitted training uses | Commercial/privacy owners | Live customer data and content collection |
| Stack, integration contracts and build/buy selection | Engineering | Implementation plan approval |
| Menu, brand claims, packaging, delivery geography and channel | Brand/operations | V7 |

No future owner choice is silently presented as resolved. These decisions are product execution gates, not missing instructions for completing this PRD.

## 16. PRD completion criteria and evidence notes

This document is complete when every stated capability maps to numbered requirements, user workflows, a data lifecycle, and validation gates; owner decisions remain visible; and the document separates approved direction, proposed requirements, business hypotheses, and future experimental evidence.

The founder's description and the explicit planning answers are the primary source of product intent. An independent design advisory supplied proposed uncertainty, physical identity, recipe boundary and validation requirements; its scientific claims are not treated as established findings without source verification.

NIST's metrological traceability guidance was independently retrieved. It supports documenting traceability and uncertainty of measurement results, and makes clear that traceability alone does not establish fitness for a particular use. Source identifier: NIST Technical Note 2156, “Metrological Traceability,” sections 3.1-3.2. No NIST certification of this proposed product is implied.

The attempted UC Davis source could not be retrieved. No performance figures, sensory results, market sizes, financial forecasts, regulatory conclusions, or completed physical trials are asserted in this PRD.
