# Open Finance Format governance

Open Finance Format (OFF) is currently a founder-led project. Henry Adams is
the current maintainer and has final authority over repository access,
proposal disposition, release publication, and project direction. OFF does not
yet have a foundation, elected steering committee, or independent standards
body. Contributor participation and public review inform decisions; they do not
currently constitute a vote.

This is an honest description of the present project, not the intended final
shape. Governance should become more distributed when there are multiple
sustained independent implementations and maintainers.

## Bootstrap status

This policy and the adjacent `0.1.0-dev` protocol-operations foundation were
introduced together as a maintainer bootstrap, before an OFCP process existed.
They do not claim community consensus and do not alter `v0.1-rc.1`. Once this
policy is on the default branch, later material changes follow the public OFCP
and decision-record process below.

## Authority hierarchy

When sources conflict, use this order:

1. An immutable release candidate's authenticated commit, allowlist, and
   checksums govern that candidate.
2. The normative specification, schemas, rule registry, and corpus in the
   current development tree govern only that mutable development snapshot.
3. Accepted [OFF Change Proposals](proposals/README.md) and their
   [decision records](docs/decisions/README.md) explain changes but do not
   override published artifact bytes.
4. Implementation source, generated bundles, examples, plans, issues, and
   discussions are non-normative unless a normative document expressly
   incorporates them.

The [`v0.1-rc.1`](release/v0.1-rc.1/README.md) artifacts are frozen. Workbook
Binding is present only in post-rc.1 development. Neither a merged proposal nor
an implementation change retroactively changes rc.1; a behavioral change must
appear in a newly identified immutable candidate.

## Namespace custody

OFF uses the `openfinanceformat.org` namespace for versioned protocol, profile,
schema, and extension identifiers; the maintainer controls assignments in OFF
project artifacts. Published meanings are never reassigned. These URIs are
identifiers: retrieval is not required for conformance, and current DNS or
hosted resolution is not claimed. If hosted representations are added, each
versioned representation must correspond to the same immutable published
artifact wherever it is served.

## Decisions and changes

Small editorial corrections and implementation fixes that do not change
normative behavior may use an ordinary pull request. A change needs an OFF
Change Proposal (OFCP) when it changes or adds normative behavior, compatibility
or deprecation policy, a profile, a stable diagnostic, conformance evidence, a
security boundary, namespace policy, or governance.

The maintainer assigns proposal numbers, determines when public review is
sufficient, and records a disposition. Accepted and rejected proposals receive
an immutable decision record. Acceptance authorizes work in the mutable
development tree; it is not release publication. The complete lifecycle and
statuses are defined in [`proposals/README.md`](proposals/README.md).

Material decisions should state the evidence considered, compatibility effect,
dissent or unresolved concerns, and release boundary. Decision records are
append-only after disposition: later developments are recorded in a new decision
that supersedes the old one rather than rewriting history.

## Releases

The maintainer may publish a release candidate only after its public artifact
set, immutable version-control anchor, checksums, and claim boundaries are
explicit. Mechanical checks demonstrate consistency, not independent
interoperability, adoption, or financial correctness.

Promotion from rc.1 to v0.1 remains blocked on the public unaffiliated evidence
listed in the frozen candidate. Private clarification invalidates a clean-room
attempt; the clarification belongs in a new public candidate and testing starts
again.

## Conduct, security, and amendments

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
Security reports follow [SECURITY.md](SECURITY.md), not the public proposal
process while details remain sensitive.

Changes to this file require an OFCP. Because the project is founder-led, the
maintainer can amend governance, but must do so publicly with a decision record.
