# Design-partner pilot brief

This is a non-normative adoption experiment for a real public-equity model. It
is deliberately separate from the frozen clean-room qualification gates. No
partner, model, user count, adoption result, or outreach activity is implied by
this brief.

## Objective

Measure whether an independent analyst or research workflow can publish and
maintain one real, publicly authorized model as an immutable OFF package while
preserving source visibility, freshness, assumptions, lineage, and native
artifacts. The pilot measures authoring friction and reader utility; it does
not turn a valid package into an investment recommendation or correctness claim.

## Candidate partner categories

Select a named, opted-in human or team from a category rather than treating a
category as a prospect list:

| Category | Rationale | Evidence to request |
| --- | --- | --- |
| Independent public-markets analyst or boutique publisher | Maintains a repeatable public model and can describe authoring and refresh work | Public model scope, publication process, and permission to preserve pilot evidence |
| Research or data workflow team | Can compare an existing research workflow with a structured package | Baseline workflow, responsible data owner, and reader/consumer context |
| Finance education or open-data contributor | Can test first-time authoring and inspectability without requiring proprietary data | Public or licensed inputs, teaching/research purpose, and consent for results |

No category is an endorsement, and no named prospect has been selected or
contacted by this repository change.

## Entry criteria

A pilot may start only when all of the following are recorded by a named human
owner:

- the partner has explicitly opted in and disclosed relevant affiliation or
  conflict;
- the model inputs and native artifacts are public or authorized for the
  proposed evidence path, with no confidential or personal data in the packet;
- the target OFF candidate/development authority and the pilot's non-normative
  scope are fixed before authoring;
- a baseline workflow, time measure, repair-count convention, and reader tasks
  are agreed before the first attempt;
- the evidence retention, redaction, and publication path are agreed; and
- if the result will be described as support for a future adoption claim, the
  clean-room qualification evidence has already been independently reviewed.

An exploratory pilot may begin before the last condition only if its records
are labeled exploratory and are never used to imply promotion, adoption, or
interoperability.

## Pilot protocol

1. Record the baseline workflow and freeze the model version, input inventory,
   permissions, and start timestamp.
2. Author or convert one package without changing the normative `off.json`
   authority. Record time, repairs, unresolved warnings, and exact artifact
   digests.
3. Validate at fixed timestamps and preserve the normalized result, diagnostics,
   freshness, source links, assumptions, lineage, and native artifact mapping.
4. Ask at least one reader or independent consumer to inspect the sources,
   assumptions, headline outputs, lineage, and native artifact; record task
   completion without collecting unnecessary personal data.
5. At an agreed stale boundary, record the affected outputs and issue or plan a
   new immutable release. Do not overwrite the prior package.
6. Obtain partner sign-off on the factual pilot record and preserve the packet
   at an immutable path.

## Exit criteria

The pilot is complete only when the evidence packet records:

- the partner relationship and consent scope;
- baseline and observed authoring time, repair count, and unresolved issues;
- package, input, native-artifact, and release digests;
- validator outcomes at the agreed timestamps;
- source, assumption, lineage, and reader-inspection results;
- stale-input handling and whether a new immutable release was produced; and
- the partner's factual sign-off or an explicit reason the pilot stopped.

An exit with a failed or incomplete package is still useful pilot evidence if
the failure is preserved. It is not a conformance pass. Adoption may be
described only with the narrow evidence state supported by the immutable packet
and a separate public review; no adoption number is inferred from invitation,
participation, or a repository test.

## Stop conditions and claim boundary

Stop if data permission is unclear, the partner asks for private protocol
clarification, the model cannot be preserved without sensitive material, or a
package would be overwritten instead of released immutably. Route protocol
ambiguity through a new public candidate and record pilot interruption.

The pilot does not certify financial correctness, independent lineage review,
spreadsheet execution, promotion to v0.1, or market demand. Its evidence belongs
in the adoption track in [the roadmap](ROADMAP.md), not in the clean-room
candidate's immutable release root.
