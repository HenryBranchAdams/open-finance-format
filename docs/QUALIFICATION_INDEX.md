# External qualification index

Status: repository-ready coordination; every external gate remains pending.
Prepared: 2026-08-06. This document is non-normative and belongs to the mutable
development tree. It does not change the frozen `v0.1-rc.1` candidate or create
independent evidence.

## Start here

| Need | Use | Boundary |
| --- | --- | --- |
| Understand the current state and immutable pointers | This index | Coordination map only |
| Stage a clean candidate checkout | [qualification launchpad](QUALIFICATION_LAUNCHPAD.md) | Local, fail-closed scaffolding only |
| Hand work to a participant by role | [external handoff](QUALIFICATION_HANDOFF.md) | The frozen task files remain authoritative |
| Submit gate evidence | [evidence template](QUALIFICATION_EVIDENCE.template.md) and the [interoperability report template](../clean-room/INTEROPERABILITY_REPORT.template.md) | Copy outside the candidate; preserve immutable bytes |
| Review and adjudicate submitted evidence | [review packet](QUALIFICATION_REVIEW_PACKET.template.md) | A named public human reviewer records the result |
| Run a real-model adoption pilot | [design-partner pilot brief](DESIGN_PARTNER_PILOT.md) | Exploratory or adoption evidence, never v0.1 conformance |

## Immutable candidate pointers

These are the pointers observed for this handoff. A coordinator must verify
them through the public release and a separately controlled authenticated
channel before treating them as the anchors for a qualifying attempt.

| Item | Immutable value or pointer |
| --- | --- |
| Published prerelease | [`v0.1-rc.1` release](https://github.com/HenryBranchAdams/open-finance-format/releases/tag/v0.1-rc.1) |
| Annotated tag object | `2c2a656ecd13c7c5f27c94e12882f5fa7694f326` ([API object](https://api.github.com/repos/HenryBranchAdams/open-finance-format/git/tags/2c2a656ecd13c7c5f27c94e12882f5fa7694f326)) |
| Tag target commit | `2570e38998dd735b83da301a5b6f0e95aca47073` ([commit](https://github.com/HenryBranchAdams/open-finance-format/commit/2570e38998dd735b83da301a5b6f0e95aca47073)) |
| Release checksum manifest | [`checksums.json`](https://github.com/HenryBranchAdams/open-finance-format/releases/download/v0.1-rc.1/checksums.json) |
| `checksums.json` SHA-256 | `65ac8b6b7521ab1582275317d43d7fff819a706a233be599f2285b40f7d3a59e` |
| Release allowlist | [`files.json`](https://github.com/HenryBranchAdams/open-finance-format/releases/download/v0.1-rc.1/files.json) |
| `files.json` SHA-256 | `94b037df2794dfa55c5681d4ed546731a48ac12308c635e39c5e1344fc7bac8d` |
| Development documentation baseline | `092934bb94c126edec742b4354ba96bc192d9ce9` ([merge commit](https://github.com/HenryBranchAdams/open-finance-format/commit/092934bb94c126edec742b4354ba96bc192d9ce9)) |

The development baseline is a coordination reference only. Do not combine its
mutable specifications, tools, or documentation with the frozen candidate as
if they were one normative release.

## Current-state matrix

| Gate or deliverable | Repository evidence now present | State | Irreducible next action |
| --- | --- | --- | --- |
| Immutable candidate anchor | Published tag, target commit, release assets, and exact digest pointers above | Pointer recorded; independent authentication still pending | A named coordinator verifies both anchors through the required channels |
| Independent consumer | Frozen [consumer task](https://github.com/HenryBranchAdams/open-finance-format/blob/2570e38998dd735b83da301a5b6f0e95aca47073/clean-room/CONSUMER_TASK.md), launchpad, handoff, and evidence template | Pending | An unaffiliated implementer produces and freezes alternate-language comparison evidence |
| Independent producer | Frozen [producer task](https://github.com/HenryBranchAdams/open-finance-format/blob/2570e38998dd735b83da301a5b6f0e95aca47073/clean-room/PRODUCER_TASK.md), timed-author instructions, and evidence template | Pending | An eligible implementer freezes a distinct package before first validator comparison |
| Ten-minute Core author | Frozen timed exercise plus evidence fields | Pending | A first-time author records timer, attempts, bytes, and first valid result |
| Public evidence review | Review packet, adjudication rules, and canonical report checker | Pending | A named public human checks immutable evidence and records reviewed or failed states |
| Design-partner pilot | [Pilot brief](DESIGN_PARTNER_PILOT.md) with category-only selection guidance and entry/exit criteria | Not started | A named human partner opts in; no outreach or adoption claim is implied here |
| Promotion or adoption claim | `docs/handoff.yaml`, release report, and roadmap keep these claims separate | Not claimed | Maintainer and public decision-makers act only after the relevant external evidence exists |

## Evidence flow

1. The coordinator verifies the candidate pointers and records the verification
   method without changing the candidate.
2. Each participant receives only the authenticated frozen materials and the
   task for their role. The handoff documents are convenience coordination
   material, not a second protocol authority.
3. Participants freeze outputs, commands, runtimes, timestamps, inventories,
   and digests before any permitted reference comparison.
4. The coordinator preserves the copied report and evidence outside the
   candidate. Local rehearsals remain local rehearsals.
5. A named public human reviewer uses the review packet and records the
   evidence state through an immutable external record.
6. Any release or promotion decision is a separate governance action. Neither
   the launchpad, the evidence checker, nor a review packet makes that
   decision automatically.

## Status vocabulary

Use the canonical states enforced by `tools/qualification-evidence.mjs`:
`pending`, `author-claimed`, `independently-executed`,
`publicly-authenticated`, `publicly-reviewed`, `failed`, and `inapplicable`.
Do not use “passed,” “qualified,” “adopted,” or “promoted” as shorthand for a
local test, a participant submission, or an unreviewed report.

## Explicit non-claims

The repository currently makes no claim of independent interoperability,
public human review, promotion to v0.1, adoption, financial correctness,
independent lineage review, or exact spreadsheet execution. A completed pilot
would be adoption evidence only to the extent that its immutable scope,
metrics, participant relationship, and review status support that statement.
