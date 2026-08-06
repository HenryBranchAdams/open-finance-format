# External qualification handoff

This is a role-separated, non-normative handoff for work against the frozen
`v0.1-rc.1` candidate. Start with the [qualification index](QUALIFICATION_INDEX.md)
for the exact tag, commit, release assets, and checksum pointers. The frozen
release README and the files under `clean-room/` remain the authority for the
qualification tasks.

Do not use the mutable development tree as a substitute for the candidate. The
launchpad and these documents make coordination easier; they do not authenticate
the publisher, create independence, or turn a local result into public evidence.

## Coordinator handoff

Before a qualifying attempt:

- verify the annotated tag, target commit, `files.json`, and
  `checksums.json` against the pointers in the index;
- verify the checksum-manifest digest through a separately controlled
  authenticated channel and record the exact URL or record revision;
- create a clean candidate checkout at the tag target, outside any participant's
  implementation workspace;
- run the local launchpad only with explicit non-pending anchors and an output
  directory outside the candidate; and
- provide the participant only the candidate materials, the task for their
  role, and the public evidence-submission instructions.

Stop before inviting or starting a qualifying attempt if an anchor is pending,
the candidate is dirty, the candidate bytes do not match the immutable commit
and checksums, or a participant requests private clarification. Record the
ambiguity and restart from a new immutable candidate if the public contract
must change.

The coordinator preserves the first attempt, failed attempt, repair log,
runtime, command, timestamps, output digests, relationship disclosures, and
any ambiguity record. The coordinator does not rewrite the candidate report or
convert local rehearsal output into an external claim.

## Participant roles

### Consumer implementer

Use only the frozen [consumer task](https://github.com/HenryBranchAdams/open-finance-format/blob/2570e38998dd735b83da301a5b6f0e95aca47073/clean-room/CONSUMER_TASK.md) and its
authenticated public materials. Implement in another language, freeze the
canonical outputs before running the reference comparison, and complete the
consumer section of the [evidence template](QUALIFICATION_EVIDENCE.template.md).
Submit case-level output digests, diagnostics, freshness, lineage, evaluator
failure vectors, runtime, commands, and the immutable evidence path. A summary
that says only “tests passed” is not sufficient.

### Producer and timed Core author

Use the frozen [producer task](https://github.com/HenryBranchAdams/open-finance-format/blob/2570e38998dd735b83da301a5b6f0e95aca47073/clean-room/PRODUCER_TASK.md). Treat the
ten-minute Core exercise and distinct Public Equity package as separate
evidence. Freeze the producer package and complete inventory before the first
reference-validator invocation. Preserve the first result at each required
timestamp; a repaired package cannot replace a failed first result. Complete
the producer and timed-author sections of the evidence template.

### Public reviewer

Use the [review packet](QUALIFICATION_REVIEW_PACKET.template.md) against the
immutable submitted evidence, not against a participant's narrative alone.
Check the candidate anchors, eligibility, relationship disclosure, source
restrictions, freeze timing, first-result rules, raw-byte digests, commands,
runtime, and claim-state transitions. Record a named review in a copied packet
outside the candidate.

The reviewer adjudicates whether the submitted evidence supports the stated
qualification state. For candidate authentication, the coordinator records
`claimBasis: publicly-authenticated` only after the exact commit and digest are
verified through the required channels; the reviewer records the separate
`publicHumanReview: reviewed` fields after checking that record. The reviewer
does not certify financial correctness,
source truth, independent lineage completeness, adoption, or promotion, and
does not become the independent implementer by reviewing the submission.

### Design-partner pilot owner

Use the [design-partner pilot brief](DESIGN_PARTNER_PILOT.md). A pilot is a
separate real-model exercise, not a replacement for the three clean-room gates.
It requires an opted-in named partner and an agreed evidence scope; no partner
or adoption result exists merely because this packet is prepared.

## Handoff contents

| Contents | Source | State rule |
| --- | --- | --- |
| Candidate release and allowlist | Immutable tag and release assets | Verify before use |
| Consumer and producer tasks | Frozen candidate `clean-room/` files | Normative task instructions |
| Launchpad manifest and sequence | Local `tools/qualification-launchpad.mjs` output | Local preflight only |
| Evidence submission form | [Template](QUALIFICATION_EVIDENCE.template.md) | Copy outside the candidate |
| Review/adjudication form | [Review packet](QUALIFICATION_REVIEW_PACKET.template.md) | Named reviewer only |
| Adoption pilot scope | [Pilot brief](DESIGN_PARTNER_PILOT.md) | Separate from conformance |

Keep the candidate report template all-pending. A copied attempt report may
record `author-claimed` evidence, but only the named public reviewer may record
`publicly-reviewed` or `failed` states against an immutable evidence path. Use
the read-only checker after copying the report:

    node tools/qualification-evidence.mjs \
      --report /absolute/path/to/attempt/report.md \
      --source-kind external-attempt

Use `--source-kind local-rehearsal` only to test mechanics. It must reject
populated qualifying fields.

## Stop and escalation conditions

Stop the attempt and preserve the evidence when:

- the immutable candidate anchor or checksum digest cannot be verified;
- the participant is not eligible or the relationship disclosure is incomplete;
- a private interpretation, coaching, or implementation detail is requested;
- the producer package changes after its pre-validation freeze;
- a required output, digest, timestamp, or command record is missing; or
- the evidence cannot be placed at an immutable path accessible to the reviewer.

Escalate public-contract ambiguity through the public change process and a new
immutable candidate. Do not patch the frozen candidate or infer a pass from a
green local check.
