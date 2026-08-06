# OFCP-0000: Short title

- Status: `Draft`
- Authors: Name or stable public identifier
- Created: YYYY-MM-DD
- Discussion: Pull request or public thread
- Decision: Pending
- Supersedes: None
- Superseded by: None
- Target: Mutable post-rc.1 development or named future candidate

## Summary

State the proposed behavior and intended outcome in a few sentences.

## Problem

Describe the current observable problem, affected users or implementers, and
the public evidence that establishes it.

## Normative proposal

Specify the requirements precisely. Identify every affected specification,
schema, rule, diagnostic, profile URI, catalog, corpus artifact, or governance
document. Do not use reference source as the normative definition.

## Compatibility and versioning

Classify the change under [`spec/versioning.md`](../spec/versioning.md). State:

- whether new consumers accept and preserve old packages;
- whether old consumers can safely inventory or evaluate new packages;
- normalized-result and diagnostic changes;
- migration, deprecation, or coexistence rules; and
- whether a new candidate and restarted clean-room evidence are required.

The proposal must not retroactively change `v0.1-rc.1`.

## Security and privacy

Address untrusted input, active content, renderer isolation, network behavior,
resource limits, sensitive data, and logging as applicable. State when there is
no change and why.

## Evidence and acceptance

List focused tests, conformance vectors, independent implementation evidence,
and observable acceptance conditions. Separate local/reference consistency from
independent interoperability and live publication.

## Alternatives

Record credible alternatives, including keeping the current behavior, and why
they were not selected.

## Open questions and dissent

Preserve unresolved concerns and minority positions. Do not manufacture
consensus.

## Implementation and release plan

Name the smallest coherent implementation units, documentation, migration
material, and release boundary. Acceptance authorizes development work only;
release publication is separate.
