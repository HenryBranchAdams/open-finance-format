# OFF Change Proposals

An OFF Change Proposal (OFCP) is the public design record for a material change
to the protocol or project. It makes rationale, compatibility, evidence, and
disposition reviewable before a future release is published.

Use an OFCP for changes to normative behavior, profiles, compatibility or
deprecation policy, stable diagnostics, conformance evidence, security or
privacy boundaries, namespace custody, or governance. Editorial corrections
and implementation fixes that preserve an unambiguous contract may use a pull
request. Vulnerabilities follow [SECURITY.md](../SECURITY.md) until disclosure
is safe.

## Numbering and ownership

Copy [`0000-template.md`](0000-template.md) into a pull request. The maintainer
assigns the next four-digit number before merge. One or more named authors own
the proposal text while it is open; the current founder-maintainer owns status
transitions and final disposition under [GOVERNANCE.md](../GOVERNANCE.md).

## Statuses

| Status | Meaning |
|---|---|
| `Draft` | Incomplete proposal being made reviewable; no implementation authority. |
| `Discussion` | Complete enough for public technical and compatibility review. |
| `Accepted` | Approved for the mutable development tree, with an immutable decision record. Not released. |
| `Rejected` | Considered and declined, with an immutable decision record. |
| `Withdrawn` | Closed by its authors before disposition; rationale is retained. |
| `Implemented` | Accepted behavior and required evidence are present in development. Still not a release. |
| `Superseded` | Replaced by a named later proposal or decision; history remains intact. |

Normal transitions are `Draft` to `Discussion`, then `Accepted` or `Rejected`.
`Accepted` may become `Implemented`. An author may move an open proposal to
`Withdrawn`. Any terminal proposal may later become `Superseded` only by naming
its replacement; the prior decision is not erased.

## Lifecycle

1. **Problem framing:** identify the affected authority surface and why a
   proposal is required.
2. **Draft:** complete the template, including alternatives, two-direction
   compatibility, security/privacy effects, evidence, and release boundary.
3. **Public discussion:** resolve review in the proposal pull request or linked
   public thread. There is no fixed review period; the record must show enough
   review for the scope and risk.
4. **Disposition:** the maintainer accepts or rejects with a new record under
   [`docs/decisions/`](../docs/decisions/README.md). The proposal is then frozen
   except for a status link to that record.
5. **Implementation:** accepted work lands with tests, vectors, documentation,
   and migration material required by the decision.
6. **Release:** publication creates a separately identified immutable candidate.
   Proposal acceptance or implementation never mutates rc.1 and never by itself
   establishes interoperability.

Substantive changes after disposition require a new OFCP. Correct clerical
errors by an explicit errata decision; do not silently rewrite the accepted
record.

## Review criteria

Reviewers and the maintainer should ask whether the proposal:

- is derivable without private conventions;
- preserves offline, deterministic, safe evaluation;
- assigns one clear normative source for every behavior;
- classifies compatibility under [versioning](../spec/versioning.md);
- respects immutable URI meanings and frozen candidates;
- includes proportionate corpus and clean-room evidence;
- states privacy, logging, and active-content effects; and
- keeps conformance claims narrower than correctness or adoption claims.
