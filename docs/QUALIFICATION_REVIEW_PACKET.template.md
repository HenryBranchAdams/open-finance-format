# Public qualification review packet

Copy this template outside the candidate for one named reviewer and one
immutable evidence set. It is a review and adjudication boundary, not a
promotion certificate. The reviewer must not edit `release/v0.1-rc.1/**` or
the candidate's all-pending report template.

## Review identity

- Reviewer name or stable public identity: `pending`
- Public profile or review identity: `pending`
- Review date and timezone: `pending`
- Reviewer relationship or conflict disclosure: `pending`
- Review packet commit or archive digest: `pending`
- Evidence archive root: `pending`

## Candidate anchor review

| Check | Result | Evidence or note |
| --- | --- | --- |
| Release URL is the published `v0.1-rc.1` prerelease | `pending` | `pending` |
| Annotated tag object matches the qualification index | `pending` | `pending` |
| Tag target commit is `2570e38998dd735b83da301a5b6f0e95aca47073` | `pending` | `pending` |
| `files.json` matches the published asset and digest | `pending` | `pending` |
| `checksums.json` matches the published asset and digest | `pending` | `pending` |
| Checksum digest was verified through a separately controlled authenticated channel | `pending` | `pending` |
| Candidate report retains all pending fields | `pending` | `pending` |

## Participant and evidence review

| Area | Result | Immutable evidence path | Review note |
| --- | --- | --- | --- |
| Eligibility and relationship disclosure | `pending` | `pending` | `pending` |
| Public-materials-only attestation | `pending` | `pending` | `pending` |
| No private guidance or implementation coaching | `pending` | `pending` | `pending` |
| Consumer output freeze and alternate-language implementation | `pending` | `pending` | `pending` |
| Producer pre-validation freeze and first results | `pending` | `pending` | `pending` |
| Timed Core-author evidence | `pending` | `pending` | `pending` |
| Command, runtime, timestamp, and digest completeness | `pending` | `pending` | `pending` |
| Ambiguity and failed-attempt preservation | `pending` | `pending` | `pending` |

## Adjudication matrix

Use the canonical state names from `tools/qualification-evidence.mjs`. A
reviewer may record `publicly-reviewed` or `failed` for independence and gate
records only against an immutable evidence path and with a reason that another
person can inspect. Candidate authentication is a separate record: the
coordinator records `authentication.claimBasis: publicly-authenticated` after
the exact commit and digest are verified through the required channels, and the
reviewer records `authentication.publicHumanReview: reviewed` plus the named
review fields after checking that record.

| Gate | Reviewed state | Evidence basis | Decision reason |
| --- | --- | --- | --- |
| Candidate authentication | `pending` | `claimBasis: publicly-authenticated` after coordinator verification; `publicHumanReview: reviewed` after reviewer verification | `pending` |
| Independence | `pending` | `pending` | `pending` |
| Independent consumer | `pending` | `pending` | `pending` |
| Independent producer | `pending` | `pending` | `pending` |
| Ten-minute Core author | `pending` | `pending` | `pending` |
| Adoption/design-partner exercise | `pending` | `pending` | `pending` |

Do not use `passed` as a machine state. In a copied interoperability report,
use the checker-compatible combination of `status`, `claimBasis`, immutable
`evidencePath`, and named review fields. Preserve a reviewed failure as a
failure; do not replace it with a repaired or later attempt.

## Adjudication boundary

This review can establish only whether the submitted records support the
specified evidence states. It does not establish:

- financial correctness, investment suitability, source truth, or analytical
  quality;
- exact spreadsheet execution or independent lineage completeness;
- community consensus, adoption, or product-market fit; or
- promotion to v0.1 or permission to rewrite an immutable tag.

If the public contract is ambiguous, record the ambiguity and stop the affected
gate. A private clarification requires a new immutable candidate and a
complete restart. The maintainer and public governance process handle any
subsequent release decision separately from this review.

## Reviewer conclusion

- Evidence set reviewed: `pending`
- Gates supported by the evidence: `pending`
- Gates failed or left pending: `pending`
- Follow-up required: `pending`
- Reviewer conclusion and scope limitation: `pending`

After completing this packet, preserve it at an immutable public path and
record its commit or archive digest in the copied interoperability report. Do
not claim that the packet itself proves adoption or promotion.
