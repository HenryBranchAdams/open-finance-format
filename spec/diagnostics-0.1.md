# OFF Diagnostics 0.1

Status: experimental normative contract for `v0.1-rc.1`

Diagnostics describe package conformance. Tool failures are separate and MUST NOT be converted into package diagnostics.

## 1. Record shape

Every diagnostic contains:

| Member | Contract |
|---|---|
| `code` | Stable `OFF-Edddd` error or `OFF-Wdddd` warning code. |
| `severity` | `error` or `warning`. |
| `instanceLocation` | RFC 6901 JSON Pointer; the empty string identifies the manifest root. |
| `ruleId` | Rule ID from `rules-0.1.json`. |
| `parameters` | Canonical object containing only portable values needed to compare the violation. |

`entityId` is included when one stable entity is affected. Human-readable messages MAY be displayed but MUST NOT enter normalized output or conformance comparison. Host paths, raw OS errors, stack traces, terminal controls, and implementation-library messages are prohibited.

## 2. Severity and outcomes

An error means the package or requested profile cannot be deterministically identified, resolved, integrity-checked, normalized, or truthfully claimed. Any error produces `outcome: invalid`.

A warning means interpretation and the claimed structural conformance remain deterministic, but freshness, supporting-resource availability, author-declared exclusions, usefulness, or presentation deserves attention. Warnings never replace required information. Warnings with no errors produce `outcome: validWithWarnings`; no diagnostics produces `outcome: valid`.

## 3. Ordering and suppression

Diagnostics sort by severity rank (`error` before `warning`), then `code`, `instanceLocation`, `entityId` or empty string, `ruleId`, and RFC 8785 canonical parameter bytes. String tuple members compare lexicographically by unsigned UTF-16 code units without locale-sensitive collation; canonical parameter bytes compare lexicographically as unsigned octets.

Rules run only after their registry prerequisites pass. A failed prerequisite suppresses dependent diagnostics. All independent violations in the active stage are collected. Multiple schema-library messages mapped to one OFF rule and location collapse to one OFF diagnostic.

The `request` registry stage evaluates caller-required profile targets after the manifest's true root shape is readable. It is not part of the schema-to-Core gate: a request-stage error contributes to the package outcome but does not by itself suppress Core checks or change `profileResults.core.status`.

Only a top-level object-shape failure suppresses all lower-level schema candidates. In rc.1, that means the root value has the wrong type, a required root member assigned to `OFF.SCHEMA.ROOT` is absent, or a member prohibited by the closed root object is present. A constraint below the root does not become a root-shape failure merely because it maps to `OFF.SCHEMA.ROOT`; independent sibling diagnostics remain eligible.

## 4. Stable namespaces

- `OFF-E1xxx`: admission
- `OFF-E2xxx`: schema and declarations
- `OFF-E3xxx`: Core resources and integrity
- `OFF-E4xxx`: Public Equity entities and lineage
- `OFF-W5xxx`: freshness and non-evaluated supporting resources
- `OFF-Txxxx`: evaluator and CLI failures; these are tool codes, not diagnostics

Codes are never reassigned. A normative change to meaning requires a new code or a new normalizer contract version.

The authoritative rule-to-code mapping is [rules-0.1.json](rules-0.1.json). The registry deliberately contains no fixture locator or test-scenario field: rc.1 publishes a boundary-focused corpus, not one fixture per rule. Only case IDs and paths declared by `conformance/corpus.json` identify published corpus artifacts.

`OFF.MANIFEST.MISSING` maps to `OFF-E1006` only when the package root is readable and its exact `off.json` entry is absent. It emits once per evaluation at the manifest root, forbids `entityId`, and has an exact empty parameter object. Malformed JSON and evaluator I/O failures use their own admission diagnostic or tool-failure path and are never converted to `OFF-E1006`.

## 5. Rule-registry emission contract

Every registry rule contains an `emission` object with four normative members:

| Member | Meaning |
|---|---|
| `cardinality` | Exact maximum emission unit, such as `onePerEvaluation`, `onePerInstanceLocation`, `onePerEntity`, `onePerEdge`, `onePerRemoteLocation`, or `onePerAffectedHeadline`. Implementations emit at most one diagnostic for each named unit after prerequisite suppression. |
| `instanceLocationRule` | Deterministic rule for choosing the RFC 6901 pointer. The registry text identifies the exact member, containing object, or root. |
| `entityIdRule` | Deterministic source of `entityId`, or `omit` when the field is forbidden. |
| `requiredParameterKeys` | Sorted list of parameter keys that MUST appear. No unlisted parameter key enters the normalized diagnostic. An empty list requires `{}`. |

For `onePerInstanceLocation`, the deduplication key is `(ruleId, instanceLocation)`. For `onePerEntity`, it is `(ruleId, entityId)`. For `onePerEdge`, it is `(ruleId, fromId, toId)` or `(ruleId, fromResourceId, toResourceId)`, as named by that rule's required parameters. For `onePerRemoteLocation`, it is `(ruleId, entityId, locationIndex)`. For `onePerAffectedHeadline`, it is `(ruleId, entityId)`. `onePerEvaluation` emits at most once for the whole evaluation. If multiple candidate diagnostics share one cardinality key but have different parameters, the evaluator retains the candidate whose RFC 8785 canonical parameter bytes are lexicographically smallest as unsigned octets.

Required parameter arrays such as `staleDependencyIds` are sorted and unique before serialization. A rule that cannot deterministically construct all required parameters does not emit a partial diagnostic; failure to satisfy this registry contract is an evaluator defect.

`OFF.SCHEMA.PROFILE_TARGET` applies to evaluator-requested targets rather than a manifest value. It emits only after the true root-shape prerequisite described in Section 3 passes; a wrong root type, a missing required root member whose schema error maps to `OFF.SCHEMA.ROOT`, or a prohibited root member suppresses it. A missing required root member mapped to another rule, or an independent nested constraint, does not suppress it. The diagnostic appears at the manifest root with the requested profile URI as `entityId`; `reason` is exactly `notDeclared` when the package does not declare that target, otherwise `unsupported` when rc.1 has no consumer for it. Either result makes the requested evaluation invalid without invalidating the independently reported Core status.

Public Equity diagnostic parameter vocabularies are closed. `entityKind` is one of `security`, `scenario`, `unit`, `source`, `sourceFact`, `assumption`, `output`, or `attestation`. `expectedKind` is one of `currencyUnit`, `unit`, `source`, `scenario`, `output`, `headlineOutput`, `attestation`, `packageAuthor`, `verifiedLocalResource`, or `lineageDependency`. `OFF.PROFILE.HEADLINE` uses only `missingFields: ["lineageEdges"]`. `OFF.PROFILE.LINEAGE_EDGE` uses `reason: "self"` or `"duplicate"`. `OFF.PROFILE.LINEAGE_CYCLE.parameters.cycleEntityIds` uses the exact witness-selection algorithm in Public Equity Research 0.1. `OFF.PROFILE.ATTESTATION` uses the exact coverage definitions and first-applicable order in that profile: `missingCoverage`, `multipleCoverage`, `outputNotCovered`, `artifactResourceMismatch`, `artifactDigestMismatch`.

### 5.1 Schema failure tokens

Schema-library keyword names, messages, and parameter objects MUST NOT enter normalized output. An implementation maps each schema failure class to exactly one OFF-owned token before applying cardinality and suppression:

| Schema failure class | OFF token |
|---|---|
| Member prohibited by a closed object | `closedObject` |
| No branch of an inclusive alternative matches | `atLeastOne` |
| Value differs from a required constant | `constant` |
| Required matching array member is absent | `contains` |
| Value is outside an enumeration | `enumeration` |
| Conditional branch fails | `conditional` |
| Too many matching array members | `atMostOne` |
| Number is outside the admitted range | `numericRange` |
| Required array is empty | `nonEmptyArray` |
| Required string is empty | `nonEmpty` |
| Required object has no members | `nonEmptyObject` |
| A forbidden shape matches | `forbidden` |
| Zero or multiple exclusive alternatives match | `union` |
| String fails its lexical pattern | `lexicalPattern` |
| Object member name fails its lexical contract | `propertyName` |
| Required member is absent | `required` |
| Value has the wrong JSON type | `type` |
| Array contains duplicate values | `uniqueItems` |
| Failure class not otherwise expressible by the bundled rc.1 mapping | `schemaConstraint` |

The token is carried as `constraint` by `OFF.SCHEMA.ROOT` and as `reason` by `OFF.SCHEMA.IDENTITY`, `OFF.SCHEMA.PROFILE_DECLARATION`, or `OFF.SCHEMA.EXTENSION_NAMESPACE`. The last row is a finite compatibility token, not permission to expose an implementation keyword. Adding a schema construct that would use it is a release-authoring change: OFF maintainers MUST either assign a more specific token or publish and test the intentional `schemaConstraint` result before issuing a candidate.

For a missing required member, `instanceLocation` is the JSON Pointer of the missing child, not its containing object. For example, a missing `package.title` produces `/package/title`. Prohibited members likewise point to the prohibited child.

### 5.2 Semantic schema tokens

Semantic checks that cannot be expressed portably in JSON Schema use only the following additional tokens:

| OFF token | Meaning |
|---|---|
| `absoluteUri` | The value fails the exact offline absolute-URI lexical contract. |
| `httpsUrl` | The value fails the exact offline HTTPS lexical contract. |
| `httpsUrlWithoutUserInfo` | The value fails the HTTPS contract or contains user information. |
| `timestamp` | Package identity time is not the rc.1 real whole-second UTC form ending in `Z`; seconds must be `00` through `59` and leap seconds are forbidden. |
| `realCalendarDate` | The value is not a real Gregorian `YYYY-MM-DD` date. |
| `wholeSecondUtcTimestamp` | The value is not the rc.1 real whole-second UTC form ending in `Z`; seconds must be `00` through `59` and leap seconds are forbidden. |
| `duplicateId` | A package author ID repeats an earlier package author ID. |
| `notDeclared` | A `profileData` key has no exact matching declaration in `profiles`. |
| `diagnosticRegistry` | A normalized diagnostic does not match the published rule registry. |
| `outcomeDiagnosticSeverityMismatch` | `outcome` is not the value implied by diagnostic severities. |
| `failedStatusRequiresError` | A failed Core or profile stage has no error diagnostic. |
| `coreRetentionGroup` | `packageIdentity`, `resourceInventory`, and `extensions` are not retained or omitted as one group. |
| `corePassedRetention` | Core claims `passed` without the complete Core retention set and relationship inventory. |
| `relationshipRetention` | Relationships are retained before their Core prerequisites pass. |
| `profileEntityRetention` | Profile entities are retained before Core and relationship prerequisites pass. |
| `lineageRequiresEntities` | Resolved lineage is retained without profile entities. |
| `freshnessRequiresLineage` | Freshness is retained without both profile entities and resolved lineage. |
| `unsupportedProfilePassed` | A profile with no rc.1 normative consumer claims `passed`. |
| `profileClaimStatus` | A conformance-claim member appears on anything other than a passed Public Equity result. |
| `profileClaimRequired` | A passed Public Equity result omits one of its three required claim members. |
| `lineageRequiresPassedProfile` | Resolved lineage is retained without a passed Public Equity result. |
| `profilePassedRetention` | Public Equity claims `passed` without both profile entities and resolved lineage. |
| `failedGraphProfileStatus` | Public Equity graph-failure retention is inconsistent: profile entities and a `failed` profile status must both be present. |
| `profileRowUnion` | Profile rows are not the unique union of declared and requested exact URIs, or a row's `requested` flag is inconsistent. |
| `admissionProfileRows` | An admission-failed result retains profile rows even though declarations were not admitted. |

These names are the complete rc.1 semantic token vocabulary for schema and normalized-envelope validation. A conforming evaluator MUST NOT substitute synonyms or implementation-native names.

For duplicate package author IDs, `OFF.SCHEMA.IDENTITY` emits one diagnostic for every occurrence after the first exact ID. Its `instanceLocation` is `/package/authors/{index}/id`, its parameters are exactly `{"field":"authors.id","reason":"duplicateId"}`, and the first occurrence does not emit.

Core diagnostic parameters use these exact portable tokens:

- `OFF.CORE.RESOURCE_PATH` uses `emptyPath`, `absolutePath`, `uncPrefix`, `drivePrefix`, `backslash`, `percent`, `query`, `fragment`, `nonPrintableAscii`, `emptySegment`, `dotSegment`, `parentSegment`, `trailingDot`, `trailingSpace`, `deviceName`, `duplicatePath`, or `caseCollision` for `reason`.
- `OFF.CORE.RESOURCE_FILE` uses `missing`, `caseMismatch`, `symlink`, `nonDirectorySegment`, `nonRegularFile`, or `outsideRoot` for `reason`.
- `OFF.CORE.ENTRYPOINT` uses `unresolved`, `missingLocal`, or `missingEntrypointRole` for `reason`.
- `OFF.CORE.RELATIONSHIP` uses `unresolvedFrom`, `unresolvedTo`, or `unresolvedBoth` for `reason`.

Workbook Binding uses `OFF-E3101` through `OFF-E3106`. Their parameters are
exactly the keys in the rule registry. `OFF-E3102` uses `missing` or
`notLocallyVerified`; `OFF-E3104` uses `missing`, `sameAsSnapshot`, or
`notHttpsRemote`. Pointers are rooted at
`/profileData/https:~1~1openfinanceformat.org~1profiles~1workbook-binding~10.1`.
Schema failures remain `OFF.SCHEMA.*` and suppress the semantic pass. Core path,
file, digest, mutation, and remote-not-evaluated diagnostics are not duplicated.

`roles` is sorted and unique. `actualByteSize` is the raw streamed-byte count. SHA-256 parameters are exact lowercase hexadecimal strings. No Core parameter contains a resolved host path or operating-system message.

When a diagnostic or sanitized evaluator failure retains an admitted package-relative path, the portable rendering is deterministic ASCII: printable ASCII characters from U+0020 through U+007E are retained except that each reverse solidus is doubled; every other Unicode scalar value is rendered as `\u{HEX}` with uppercase hexadecimal digits. This rendering does not make an unsafe path valid. Absolute resolved paths, terminal controls, and host-native error strings remain prohibited.
