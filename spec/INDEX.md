# OFF specification index

This index identifies protocol authority. It is not itself a release.

## Frozen v0.1-rc.1

`v0.1-rc.1` is an immutable experimental interoperability candidate. Its exact
artifact membership is the allowlisted file bytes at the candidate's pinned Git
revision, with drift checks supplied by the candidate checksums. Full publisher
authentication also requires an immutable public anchor and an independently
published checksum-manifest digest; the frozen evidence records those external
anchors as pending. See the frozen [release README](../release/v0.1-rc.1/README.md).

The candidate contains these normative contracts:

1. [OFF Core 0.1](OFF-Core-0.1.md)
2. [Public Equity Research 0.1](profiles/public-equity-research-0.1.md)
3. [Normalization 0.1](normalization-0.1.md)
4. [Diagnostics 0.1](diagnostics-0.1.md)
5. [Conformance 0.1](conformance-0.1.md)
6. [Rule registry](rules-0.1.json)

The frozen commit, not the mutable files at those paths today, determines the
exact rc.1 bytes. Its only normative profiles are Core and Public Equity
Research. rc.1 is not amended in place.

## Mutable post-rc.1 development

The current checkout is an unreleased development snapshot. It retains the
contracts above and adds the [Workbook Binding 0.1](profiles/workbook-binding-0.1.md)
development profile. Workbook Binding is not part of rc.1 and its presence in
the development corpus or evaluator does not create rc.2 or v0.1.

The following documents govern development-wide interpretation:

- [Normative terminology](terminology.md)
- [Versioning and compatibility](versioning.md)
- [Offline schema resources](schema-resources-0.1.md)
- [Security and privacy considerations](security-privacy-considerations.md)

Normative package data comes only from `off.json`. Schemas constrain admitted
shapes, the rule registry assigns stable rules and diagnostics, and the
conformance corpus supplies public behavior examples. When they disagree, the
conflict is a specification defect to resolve through the
[change process](../proposals/README.md), not permission to guess from the
reference implementation.

Profile and schema URIs are stable identifiers. This repository does not claim
that `openfinanceformat.org` currently resolves them. Offline and clean-room
implementations use the authenticated checked-in artifact catalog; hosted URI
resolution is a separate publication task.

## Non-normative material

Reference source, `dist/off.mjs`, examples, strategy, plans, and narrative docs
can help explain or test the protocol but cannot override normative artifacts.
Clean-room implementers must follow the stricter
[implementer guide](../docs/IMPLEMENTERS.md) and frozen task instructions.
