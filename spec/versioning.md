# OFF versioning and compatibility

Status: normative for mutable post-`v0.1-rc.1` development. This policy does
not rename, patch, or reinterpret the frozen candidate.

## Version surfaces

OFF versions several surfaces independently:

| Surface | Identifier | Meaning |
|---|---|---|
| Package language | `offVersion` | Core manifest and normalization family understood by a consumer. |
| Package release | `package.releaseVersion` and `releaseId` | Author-controlled identity of one immutable package release; not an OFF protocol version. |
| Profile | exact profile URI | Profile contract selected by the package and caller. |
| Schema | exact `$id` | Input or result shape for the named contract. |
| Rule/diagnostic | stable rule ID and code | Portable conformance behavior; codes are never reassigned. |
| Protocol candidate | tag, immutable commit, allowlist, checksums | Exact public artifact set offered for interoperability testing. |

OFF-owned versioned URIs under `openfinanceformat.org` have immutable meanings
and are never reassigned. They are identifiers, not a promise of live web
resolution. Conformance **MUST** use locally authenticated artifacts and
**MUST NOT** dereference them. Any future hosted representation **MUST**
correspond to the same immutable versioned artifact.

## Change taxonomy

Every protocol change **MUST** be classified in its OFF Change Proposal or pull
request:

| Class | Test | Required treatment |
|---|---|---|
| Editorial | No admitted input, result, diagnostic, claim, or security behavior changes. | May land in development without a new contract identifier; never changes frozen bytes. |
| Implementation correction | Reference behavior is brought into agreement with an unambiguous existing contract. | Add regression evidence; record whether prior output was wrong. |
| Compatible extension | Existing Core packages retain meaning; new behavior is opt-in through an extension namespace or a new independent profile URI. | Specify unsupported-consumer behavior and add public vectors. |
| Behavioral change | A result, diagnostic, safety limit, claim, or interpretation changes for the same input. | Publish only in a new candidate and identify the affected contract surface. |
| Breaking change | Previously conforming input becomes invalid, required meaning cannot be understood by an older consumer, or a stable field/code changes meaning. | Increment the affected version or URI; include migration and coexistence rules. |

Closed objects make apparently additive fields incompatible unless the existing
contract explicitly provides an extension point. A new optional field is not
automatically backward compatible. New profiles can be independently
compatible only when Core remains valid and unsupported profile handling stays
`notEvaluated` unless the caller requires that profile.

## Compatibility statements

A proposal **MUST** state compatibility in both directions:

- whether a new consumer accepts and preserves an older package; and
- whether an older consumer can safely inventory or evaluate a new package.

It must also identify normalized-output changes, diagnostic changes, security
effects, and whether clean-room evidence must restart. Passing current reference
tests is not by itself a compatibility proof.

## Deprecation

Deprecation is prospective and never edits a frozen candidate:

1. **Discouraged** — supported, but guidance recommends an alternative.
2. **Deprecated** — still supported for the stated version window; diagnostics
   and migration guidance are published without changing existing code meaning.
3. **Removed** — accepted only under a new incompatible contract identifier or
   version after the announced window.

The proposal introducing deprecation **MUST** name the affected surface,
replacement, rationale, earliest removal version, and preservation behavior.
Stable diagnostic codes are never recycled after removal.

## Candidate immutability

`v0.1-rc.1` remains byte-for-byte frozen. Workbook Binding is post-rc.1
development only. Any clarification that affects clean-room interpretation is a
behavioral change for release purposes: publish a new immutable candidate and
restart the affected evidence, even if `offVersion` remains `0.1`.
