# OFF Public Equity Research 0.1

Status: experimental normative profile for `v0.1-rc.1`

This document uses RFC 8174 requirement terms. A package claiming this profile MUST first satisfy [OFF Core 0.1](../OFF-Core-0.1.md).

Profile URI: `https://openfinanceformat.org/profiles/public-equity-research/0.1`

The highest claim in this profile is **Traceable — author-declared lineage**. It is not an independent audit or a claim of exact computational reproducibility.

## 1. Profile data

The exact profile URI MUST appear in `profiles` and as a key in `profileData`. Its value MUST contain non-empty `securities`, `scenarios`, `units`, `sources`, `sourceFacts`, `assumptions`, `outputs`, `lineageEdges`, and `attestations` arrays.

Every entity has a globally unique absolute-URI `id`. References use exact ID strings and MUST resolve to the required entity kind. The top-level entity collections are input-order-insensitive and normalize by entity ID. Reference-set arrays such as `scenarioIds` and `outputIds` normalize as sorted unique exact IDs; lineage edges use the order in Section 3. Authored prose arrays such as `knownExclusions` preserve authored order.

## 2. Entities

All fields not listed in these tables are invalid. `date` means a real `YYYY-MM-DD` calendar date. `timestamp` means the rc.1 whole-second UTC subset of RFC 3339: a real Gregorian `YYYY-MM-DDTHH:MM:SSZ` value with hour `00` through `23`, minute `00` through `59`, and second `00` through `59`. Leap seconds are not admitted.

A typed value contains exactly `type` and `value`:

| `type` | `value` type |
|---|---|
| `decimal` | Canonical decimal string from Normalization 0.1. |
| `string` | JSON string. |
| `boolean` | JSON boolean. |
| `date` | `date` string. |

### 2.1 Security, scenario, unit, and source

| Entity | Field | Required | Type / constraint |
|---|---|---|---|
| security | `id` | yes | Absolute URI. |
| security | `issuerName`, `ticker`, `exchange`, `securityType` | yes | Non-empty strings. |
| security | `reportingCurrencyUnitId` | yes | Reference to a unit whose `kind` is `currency`. |
| security | `identifiers` | no | Object with non-empty keys made only of printable ASCII code points U+0021 through U+007E (space U+0020 is excluded), and non-empty string values. |
| scenario | `id` | yes | Absolute URI. |
| scenario | `label` | yes | Non-empty string. |
| scenario | `role` | yes | `base`, `bull`, `bear`, or `other`. |
| scenario | `description` | no | Non-empty string. |
| unit | `id` | yes | Absolute URI. |
| unit | `label`, `symbol` | yes | Non-empty strings. |
| unit | `kind` | yes | `currency`, `shares`, `ratio`, `percentage`, `multiple`, `count`, or `custom`. |
| unit | `currency` | conditional | Required exactly when `kind` is `currency`; three uppercase ASCII letters. Forbidden otherwise. |
| source | `id` | yes | Absolute URI. |
| source | `title`, `publisher` | yes | Non-empty strings. |
| source | `canonicalUrl` | conditional | HTTPS URL without user information. At least one of this field or `evidenceResourceId` is required. |
| source | `evidenceResourceId` | conditional | Reference to a locally available Core resource. At least one of this field or `canonicalUrl` is required. |

### 2.2 Facts, assumptions, and outputs

| Entity | Field | Required | Type / constraint |
|---|---|---|---|
| sourceFact | `id` | yes | Absolute URI. |
| sourceFact | `label` | yes | Non-empty string. |
| sourceFact | `value` | yes | Typed value. |
| sourceFact | `unitId` | conditional | Required for `decimal`; reference to a unit. Forbidden for other value types. |
| sourceFact | `effectiveDate` | yes | `date`. |
| sourceFact | `sourceId` | yes | Reference to a source. |
| sourceFact | `staleAt` | yes | `timestamp`. |
| assumption | `id` | yes | Absolute URI. |
| assumption | `label` | yes | Non-empty string. |
| assumption | `value` | yes | Typed value. |
| assumption | `unitId` | conditional | Required for `decimal`; reference to a unit. Forbidden for other value types. |
| assumption | `effectiveDate` | yes | `date`. |
| assumption | `designation` | yes | Exact string `analystJudgment`. |
| assumption | `reviewBy` | yes | `timestamp`. |
| assumption | `scenarioIds` | no | Non-empty unique array of scenario references. |
| output | `id` | yes | Absolute URI. |
| output | `label` | yes | Non-empty string. |
| output | `value` | yes | Typed value. |
| output | `unitId` | conditional | Required for `decimal`; reference to a unit. Forbidden for other value types. |
| output | `asOfDate` | yes | `date`. |
| output | `scenarioId` | yes | Reference to a scenario. |
| output | `headline` | yes | JSON boolean. |
| output | `artifactResourceId` | yes | Reference to a locally verified Core resource. |
| output | `methodology` | yes | Non-empty human-readable string. |
| output | `attestationId` | conditional | Required when `headline` is `true` and forbidden when `headline` is `false`. Reference to an attestation that covers this output. |

## 3. Lineage and attestation

Each lineage edge has the following closed shape:

| Field | Required | Type / constraint |
|---|---|---|
| `fromId` | yes | Reference to a dependent output. |
| `toId` | yes | Reference to an output, source fact, or assumption dependency. |
| `material` | yes | JSON literal `true`. |

Self-edges, duplicate edges, invalid endpoints, and cycles are invalid.

When a graph contains more than one cycle, `cycleEntityIds` uses this exact deterministic witness-selection algorithm:

1. Sort all graph node IDs and every node's unique adjacency list in ascending unsigned UTF-16 order. Edges point from dependent output to dependency. Run Kahn topological sorting with each node's indegree equal to its incoming-edge count and a minimum queue ordered by the same ID comparison.
2. Let `remaining` be the sorted node IDs that Kahn did not emit. Run iterative depth-first search over roots in that order, skipping roots already colored complete. A stack frame contains the node ID and the index of its next sorted neighbor. Color a newly pushed node active; after its final neighbor, color it complete and pop it. Ignore neighbors outside `remaining`.
3. For an unseen neighbor, push it. For an active neighbor, take the stack suffix beginning at that neighbor's first stack occurrence, sort its unique IDs by the same comparison, emit that array as `cycleEntityIds`, and stop all searching. If no active-neighbor edge is found, emit all IDs in `remaining` in sorted order; this fallback is defensive and is unreachable for a correctly constructed finite graph after Kahn leaves nodes.

This selects one actual cycle, not every cyclic node or strongly connected component, and is independent of authored edge order.

Every material path from a headline output MUST terminate in source facts or analyst assumptions. Deterministic graph ordering uses ascending ID order for ties.

An attestation has the following closed shape:

| Field | Required | Type / constraint |
|---|---|---|
| `id` | yes | Absolute URI. |
| `outputIds` | yes | Non-empty unique array of headline-output references. |
| `authorId` | yes | Reference to a package author. |
| `attestedAt` | yes | `timestamp`. |
| `artifactResourceId` | yes | Reference to the locally verified artifact used by every covered output. |
| `artifactSha256` | yes | Exact lowercase 64-hex Core digest of that artifact. |
| `lineageBasis` | yes | Exact string `author-declared`. |
| `materialityPolicy`, `scope` | yes | Non-empty strings. |
| `knownExclusions` | yes | Array of non-empty strings; may be empty. |
| `lineageCompleteness` | yes | Exact string `attested-not-independently-verified`. |

The author ID MUST match a package author. An attestation **covers** an output exactly when the output ID appears in its `outputIds`; the output **selects** the attestation whose ID equals its `attestationId`. Each headline output MUST be covered by exactly one matching selected attestation.

After reference prerequisites pass, a validator applies the first applicable attestation reason per headline in this exact order:

1. `missingCoverage`: zero attestations cover the output.
2. `multipleCoverage`: more than one attestation covers the output.
3. `outputNotCovered`: exactly one attestation covers the output, but it is not the selected attestation.
4. `artifactResourceMismatch`: the matching selected attestation's artifact is not the output's artifact.
5. `artifactDigestMismatch`: that artifact's attested digest does not equal its locally verified Core digest.

A validator verifies graph coherence, terminal designations, references, and artifact binding; it does not prove the author's completeness assertion.

## 4. Freshness

Evaluation uses the explicit UTC timestamp supplied in the evaluation context.

- A source fact is `current` before `staleAt` and `stale` at or after it.
- An assumption is `current` before `reviewBy` and `stale` at or after it.
- An output's state is the worst state among all reachable material dependencies, evaluated in reverse topological order.

A stale leaf and each affected headline output produce deterministic warnings. Staleness does not invalidate an otherwise conforming profile.

## 5. Result claim

When Core and all structural profile rules pass, the profile result reports `structuralConformance: passed`, `claim: Traceable — author-declared lineage`, and `lineageCompleteness: attested-not-independently-verified`. Freshness states and warnings are derived separately.

Formula graphs, spreadsheet execution, interactive recalculation, tool-extracted lineage, and independently reviewed lineage are outside this profile.
