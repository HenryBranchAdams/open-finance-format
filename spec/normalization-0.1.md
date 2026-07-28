# OFF Normalization 0.1

Status: experimental normative development contract after `v0.1-rc.1`. The
frozen candidate is determined by its pinned Git snapshot; this mutable copy
also describes post-rc.1 Workbook Binding output.

Normalizer contract version: `0.1`

## 1. Evaluation context

Each package-result evaluation receives an explicit `evaluatedAt` whole-second UTC timestamp and requested profile URI set. The normalized result always records `offVersion`, `normalizerVersion`, `evaluatedAt`, requested profiles, outcome, and diagnostics. An `evaluatorFailure` is a separate tool result and has no normalized package result or canonical bytes.

## 2. Admission

Before byte admission, an evaluator that can read the package root but finds no exact `off.json` entry MUST emit `OFF-E1006` for `OFF.MANIFEST.MISSING`. The diagnostic has the empty root pointer, omits `entityId`, and contains exactly `parameters: {}`. This is a package-invalid admission result. A root-access failure or an `off.json` entry that cannot be read is an `evaluatorFailure`, not this diagnostic; malformed `off.json` bytes continue through the admission rules below and MUST NOT be relabeled as missing.

The evaluator MUST decode `off.json` as fatal UTF-8 and scan raw tokens before ordinary JSON parsing. It rejects malformed JSON, duplicate object names at any depth, unpaired surrogates, and number tokens that are not finite IEEE-754 binary64 values. Number-token acceptance is path-aware:

Admission `byteOffset` parameters are zero-based offsets into the original `off.json` octets. For malformed UTF-8, the offset is the illegal leading octet or the first offending continuation octet; a truncated multioctet sequence reports its leading octet. For malformed JSON after successful UTF-8 decoding, the offset is the first octet at which the JSON grammar expectation fails. A failure caused by end of input reports the input byte length. Implementations map decoded positions back to the original UTF-8 prefix length; they do not report UTF-16 code-unit positions.

If a member name contains a lone surrogate, the evaluator emits `OFF-E1004` at the nearest containing object whose JSON Pointer contains only Unicode scalar values. It suppresses all other diagnostics and number-token metadata for that invalid member name and the value beneath it, while still scanning the subtree for JSON syntax and evaluator resource limits. Before RFC 8785 parameter comparison, the evaluator removes any remaining diagnostic candidate whose `instanceLocation` or string parameter contains a lone surrogate; the containing-object `OFF-E1004` is retained. This portability suppression never turns invalid package content into an evaluator failure.

| Location | Accepted token |
|---|---|
| A number-valued field defined by OFF or a known profile | Canonical non-negative safe integer: `0` or `[1-9][0-9]*`, with value at most `9007199254740991`. Negative zero, signs, fractions, and exponents are invalid. |
| Inside an unknown value under `extensions` | Any valid JSON number token whose value is finite binary64. RFC 8785 determines its output spelling; for example, extension `-0` serializes as `0`. |
| Any other manifest location | Invalid because no current OFF field admits a JSON number there. |

Exact financial quantities are strings matching optional `-`, an integer part of `0` or `[1-9][0-9]*`, and an optional fractional part whose final digit is `1` through `9`. Negative fractional values such as `-0.5` are valid. A decimal string has no exponent, leading plus, redundant leading zero, trailing fractional zero, or numerically negative-zero form such as `-0` or `-0.0`.

Calendar dates use `YYYY-MM-DD` and MUST be real Gregorian dates. Timestamps use the rc.1 whole-second UTC subset of RFC 3339: real Gregorian `YYYY-MM-DDTHH:MM:SSZ` values with hour `00` through `23`, minute `00` through `59`, and second `00` through `59`. Leap seconds are not admitted. Optional data is omitted; `null` is invalid unless a later specification explicitly permits it.

Strings are never Unicode-normalized. Absolute URI strings and HTTPS URLs retain exact admitted spelling and are never dereferenced.

### 2.1 Offline URI lexical contract

URI validation is an ASCII lexical operation over the admitted string. It does not invoke a URL parser, perform name resolution, decode percent escapes, apply Unicode host processing, or fetch a resource.

An rc.1 absolute URI MUST:

- begin with a scheme matching `[A-Za-z][A-Za-z0-9+.-]*:`;
- have at least one character after the colon and before the first `?` or `#`;
- contain after the colon only RFC 3986 unreserved characters, general delimiters, sub-delimiters, or percent escapes; and
- use `%` only as part of `%HH`, where each `H` is an ASCII hexadecimal digit, and contain at most one `#`.

Equivalently, every non-escape character after the colon is an ASCII letter or digit, or exactly one of `-`, `.`, `_`, `~`, `:`, `/`, `?`, `#`, `[`, `]`, `@`, `!`, `$`, `&`, `'`, `(`, `)`, `*`, `+`, `,`, `;`, or `=`. A raw backslash is not admitted; a percent-encoded backslash is ordinary opaque URI data. This is the exact rc.1 lexical contract; it intentionally does not claim full scheme-specific semantic validation. For example, `urn:off:test:package`, `x:a[b]`, and `x:a%5Cb` are valid, while `urn:`, `x:%zz`, `x:a\b`, `x:bad space`, and `x:é` are invalid.

An rc.1 HTTPS URL MUST first satisfy that absolute-URI contract. Its scheme compares case-insensitively to `https`, the characters after the colon MUST begin `//`, and the authority MUST contain a non-empty host. User information is forbidden, so `@` MUST NOT appear in the authority. An unbracketed host uses only unreserved characters, sub-delimiters, and valid percent escapes; it MAY have one `:` followed by one or more ASCII decimal port digits. A bracketed host MUST have non-empty bracket contents using unreserved characters, sub-delimiters, `:`, and valid percent escapes, followed only by an optional decimal port. Empty ports, unmatched brackets, and unbracketed multiple colons are invalid. The path, query, and fragment retain their admitted spelling under the absolute-URI character rules.

## 3. Canonical semantic order

Before serialization, consumers MUST apply the following rules. A purported normalized result that violates them is invalid even when its JSON object shape otherwise satisfies the result schema:

- sort profiles and ASCII-token sets lexically;
- sort resources and each profile-entity collection by exact `id`;
- sort reference-set arrays by exact referenced ID and remove duplicates where the input contract defines set semantics;
- sort resource locations by `kind`, then exact path or URL;
- sort relationships by `fromResourceId`, `relation`, then `toResourceId`;
- sort lineage edges by `fromId`, then `toId`;
- sort diagnostics by the tuple in Diagnostics 0.1; and
- retain ordered author prose and authored prose arrays such as `knownExclusions` in authored order.

Local locations retain only package-relative paths. Absolute host paths, operating-system errors, stack traces, wall-clock values, UI state, display formatting, and implementation-specific objects MUST NOT enter the normalized result.

Unknown namespaced extension values are recursively retained as admitted JSON and participate in canonical serialization without interpretation.

The normalized in-memory value and every diagnostic parameter object are detached snapshots: after construction, later mutation of caller-owned arrays or objects MUST NOT change them. A producer MUST recursively copy all retained arrays and objects before exposing a result. Implementations SHOULD make the detached tree recursively immutable when their language supports it; the reference implementation recursively freezes it. This in-memory requirement is separate from, and precedes, RFC 8785 byte serialization.

## 4. Result envelope wire contract

Every `packageResult` is one JSON object. Members not authorized by the retention table below MUST be omitted; they MUST NOT appear as `null`, placeholders, or implementation-specific values. When a retained array or object has no members, it is present as `[]` or `{}`.

| Top-level member | Exact value shape |
|---|---|
| `evaluationContext` | Object with `offVersion: "0.1"`, `normalizerVersion: "0.1"`, `evaluatedAt`, and sorted unique `requestedProfiles`. |
| `outcome` | Exactly `valid`, `validWithWarnings`, or `invalid`. |
| `profileResults` | Object with `core: {status}` and `declared`, an array of profile-result objects. Core status is exactly `passed` or `failed`. |
| `packageIdentity` | Package identity object defined below. |
| `resourceInventory` | Array of normalized resource objects defined below. |
| `relationshipInventory` | Array of `{fromResourceId, relation, toResourceId}` objects. |
| `profileEntities` | Object keyed by exact supported profile URI. Public Equity and Workbook Binding use their profile-defined payloads below. |
| `resolvedLineage` | Array of `{fromId, toId, material}` objects. |
| `freshness` | Object with `leaves` and `headlines` arrays. |
| `extensions` | Canonically preserved root extension object. |
| `diagnostics` | Array of records defined by Diagnostics 0.1. |

Each `profileResults.declared` entry is `{uri, requested, status}` plus optional `claim`, `structuralConformance`, and `lineageCompleteness` only when the applicable profile defines them. `requested` is a JSON boolean; `status` is `passed`, `failed`, or `notEvaluated`. Entries sort by `uri`.

A Public Equity row with `status: "passed"` MUST be accompanied by both the Public Equity value in `profileEntities` and `resolvedLineage`. A normalized result that asserts the passed row while omitting either retained member is invalid.

A Workbook Binding row with `status: "passed"` has exactly the claim `Bound —
author-declared workbook locators` and MUST be accompanied by its value in
`profileEntities`. It does not carry Public Equity's
`structuralConformance` or `lineageCompleteness` members.

`profileResults.core.status` is `failed` for package-invalid admission, Core-manifest schema, or Core results and `passed` only after Core succeeds. Core never reports `notEvaluated`. A declared profile is `notEvaluated` until its requested evaluator stage succeeds or fails; it is `passed` on success and `failed` on a requested profile error. A declared but unrequested profile remains `notEvaluated`. A declared profile that the caller explicitly requests but rc.1 does not support is `failed` with `OFF-E2006`; its independently evaluated Core result MAY remain `passed`.

For normalized-envelope consistency, an error at the `admission` or `core` registry stage, or a Core-manifest `schema` error, is incompatible with Core `passed`. A `schema` error whose instance location is the Public Equity value at `/profileData/https:~1~1openfinanceformat.org~1profiles~1public-equity-research~10.1` or one of its descendants is a Public Equity schema error and does not reverse an independently completed Core pass. The same is true of `OFF.SCHEMA.PROFILE_DECLARATION` at `/profileData` with `reason: required`, because Core permits the member to be absent while the requested Public Equity profile requires it. Public Equity `passed` is incompatible with such a profile-schema error or an error at the `publicEquity` stage. Request-stage errors are non-gating, and freshness warnings do not reverse a passed Core or Public Equity result.

Each requested profile row agrees bidirectionally with its applicable diagnostics. A request-stage error applies only to the row whose URI equals the diagnostic `entityId`. Public Equity schema errors defined above and every `publicEquity`-stage error apply to the requested Public Equity row. A row with an applicable error is `failed`, and a requested row is `failed` only when such an error exists. Public Equity is `passed` only after its graph stage succeeds; freshness warnings remain compatible with that pass. A requested row is `notEvaluated` only when its profile stage did not run and it has no applicable request or profile error. Every declared-but-unrequested row, including an unknown profile, remains `notEvaluated`.

`OFF-E2006` belongs to the non-gating `request` registry stage. It contributes to `outcome: invalid`, but retention follows the deepest manifest stage completed independently of that diagnostic. Consequently, an otherwise Core-valid package with an unsupported requested profile retains the complete Core result and reports Core `passed` while the requested profile row is `failed`.

`packageIdentity` contains exactly `id`, `releaseId`, `releaseVersion`, `title`, `authors`, `license`, `publishedAt`, `canonicalUrl`, `entrypointResourceId`, and `declaredProfiles`. Authors are `{id, name}` objects sorted by ID. License is `{id}` with optional `url`. Declared profiles are sorted exact URI strings.

Each `resourceInventory` entry contains `id`, `mediaType`, sorted `roles`, `locations`, and optional `byteSize` and `sha256` when declared. A local location is `{kind: "local", path, availability, integrity}`; a remote location is `{kind: "remote", url, availability: "notEvaluated", integrity: "notEvaluated"}`. Local `availability` is `available` or `notEvaluated`; local `integrity` is `verified` or `notEvaluated`.

The Public Equity value in `profileEntities` contains exactly `securities`, `scenarios`, `units`, `sources`, `sourceFacts`, `assumptions`, `outputs`, and `attestations`. Each collection contains the admitted fields defined by the profile, omits absent optional fields, and sorts by entity ID. Lineage is not duplicated there.

The Workbook Binding value contains exactly `workbooks`, `subjects`, `bindings`,
and `unevaluated`. Each record array sorts by exact `id`. Authored locator
strings are not rewritten. `unevaluated` contains
`workbookContents`, `locatorExistence`, `cellValues`, `formulas`, and
`recalculation`, each exactly `notEvaluated`. A workbook with a declared live
source retains its exact resource ID and adds
`liveSourceStatus: "notEvaluated"`; both members are omitted otherwise.

Each freshness leaf is `{entityId, status, threshold}` and each headline entry is `{entityId, status, staleDependencyIds}`. The `leaves` and `headlines` arrays each sort by exact `entityId`. `status` is `current` or `stale`; `threshold` is the leaf's exact `staleAt` or `reviewBy`; `staleDependencyIds` is a sorted unique exact-ID array.

Every retained Core or profile value continues to satisfy the lexical rules of the normative manifest field from which it was derived, including absolute URIs, HTTPS URLs, real dates, whole-second timestamps, ASCII tokens, media types, and safe local paths. Normalized-result validation also enforces the canonical ordering and uniqueness rules above; canonical JSON object-key ordering alone does not repair a non-canonical array.

### 4.1 Retention by stage

| Final package-result state | Required members beyond `evaluationContext`, `outcome`, `profileResults`, and `diagnostics` |
|---|---|
| Admission failed | None. `profileResults.core.status` is `failed`; `declared` is empty. |
| Admission passed, schema failed | If and only if the root `profiles` member independently satisfies its array/URI shape, include those entries in `profileResults.declared`; no other conditional top-level member is present. |
| Schema passed, Core failed | Include `packageIdentity`, schema-admitted `extensions`, and `resourceInventory` containing remote descriptors plus only those local records whose path, regular-file, size, and digest checks all passed. Included local locations are `available` and `verified`. Omit `relationshipInventory`. |
| Core passed | Include `packageIdentity`, complete `resourceInventory`, `relationshipInventory`, and `extensions`. `profileResults.core.status` is `passed`. |
| Workbook Binding passed | Additionally include the Workbook Binding value in `profileEntities`; no lineage or freshness member is implied. |
| Public Equity schema passed, graph failed | Additionally include the Public Equity value in `profileEntities`; omit `resolvedLineage` and `freshness`. |
| Public Equity graph passed | Additionally include `resolvedLineage`. |
| Freshness completed | Additionally include `freshness`. |

On a Core failure, every failed or unsafe local record is omitted from `resourceInventory`; its diagnostic remains authoritative. Remote resource locations always retain `notEvaluated` statuses. An unknown declared profile may be inventoried in `profileResults` but never creates a `profileEntities` member unless that profile's normative consumer succeeds.

### 4.2 Canonical shape example

The following shows the complete nesting for a successful Core-only result; concrete values are illustrative.

```json
{
  "evaluationContext": {
    "offVersion": "0.1",
    "normalizerVersion": "0.1",
    "evaluatedAt": "2026-07-17T12:00:00Z",
    "requestedProfiles": []
  },
  "outcome": "valid",
  "profileResults": {
    "core": { "status": "passed" },
    "declared": []
  },
  "packageIdentity": {
    "id": "urn:example:package",
    "releaseId": "urn:example:release:1",
    "releaseVersion": "1",
    "title": "Example",
    "authors": [{ "id": "urn:example:author", "name": "Example Author" }],
    "license": { "id": "Apache-2.0" },
    "publishedAt": "2026-07-17T12:00:00Z",
    "canonicalUrl": "https://example.org/releases/1",
    "entrypointResourceId": "urn:example:resource:entrypoint",
    "declaredProfiles": []
  },
  "resourceInventory": [{
    "id": "urn:example:resource:entrypoint",
    "mediaType": "text/markdown",
    "roles": ["entrypoint"],
    "locations": [{
      "kind": "local",
      "path": "OFF.md",
      "availability": "available",
      "integrity": "verified"
    }],
    "byteSize": 12,
    "sha256": "0000000000000000000000000000000000000000000000000000000000000000"
  }],
  "relationshipInventory": [],
  "extensions": {},
  "diagnostics": []
}
```

## 5. Canonical bytes

The final normalized value MUST be serialized with RFC 8785 JSON Canonicalization Scheme and UTF-8, with no byte-order mark or trailing newline. Correct implementations given the same admitted package and evaluation context MUST emit byte-identical bytes.
