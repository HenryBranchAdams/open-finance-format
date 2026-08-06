---
name: prepare-off-clean-room-qualification
kind: function
---

# Prepare OFF clean-room qualification

### Parameters

- repository_root: the isolated OFF worktree used for local implementation
- baseline_ref: the revalidated local development commit
- frozen_candidate: the frozen v0.1-rc.1 candidate identity and pinned commit
- authority: local-only implementation authority with external actions excluded

### Returns

- candidate_boundary_report: the verified frozen-versus-mutable boundary and excluded dirty-state record
- qualification_campaign_bundle: the non-normative local launchpad, participant handoff, and focused tests
- repository_change_summary: task-owned files, local commits, and material decisions
- acceptance_manifest: exact checks, results, skipped evidence, fingerprints, and remaining risks
- independent_verifier_report: one complete batched read-only verdict
- external_action_checkpoint: the exact public-authentication and human-review work still requiring external authority

### Errors

- frozen_candidate_drift: the pinned release bytes differ from the frozen snapshot
- frozen_candidate_unavailable: the pinned commit or required local object is unavailable
- public_contract_ambiguity: public materials cannot determine a required rule without private clarification
- unsafe_worktree_conflict: the task would touch unrelated user-owned state
- toolchain_blocked: no acceptance-equivalent local verification route exists
- authority_required: the next action requires publication, credentials, recruitment, or public review

### Invariants

- The primary dirty checkout and release/v0.1-rc.1 remain untouched.
- The mutable development tree never becomes the rc.1 candidate root.
- Local preparation never claims public authentication, independence, public review, promotion, adoption, or financial correctness.
- Participant materials remain non-normative projections of the authenticated candidate.
- The independent verifier reads the integrated result without editing it and batches all findings before repair.

### Strategies

- Prefer the smallest launchpad outside the closed clean-room, scripts, and release roots.
- Reuse existing release validation, task wording, and evidence-template semantics rather than duplicating OFF conformance.
- Treat missing external anchors as a checkpoint, not as a reason to synthesize evidence.

### Tools

- cli:git
- cli:node

### Shape

- self: coordinate boundary audit, local launchpad implementation, focused checks, repair, and final evidence
- delegates: candidate-boundary-auditor, qualification-kit-builder, independent-acceptance-verifier
- prohibited: modifying the frozen release, running a qualifying implementation, publication, recruitment, credentials, or external evidence mutation

### Execution

```prose
let candidate_boundary_report = session """
  Audit repository_root={repository_root} at baseline_ref={baseline_ref} and
  frozen_candidate={frozen_candidate} under authority={authority}. Inspect the pinned v0.1-rc.1 snapshot,
  release allowlist and checksums, current dirty-state exclusions, and every
  local-versus-external evidence boundary. Do not edit files or perform
  external actions. Return exact paths, commands, and findings.
"""

let qualification_campaign_bundle = session """
  Using the candidate boundary report {candidate_boundary_report} by reference,
  implement the smallest fail-closed,
  non-normative OFF clean-room qualification launchpad outside closed release
  roots in repository_root={repository_root}. Add focused tests and synchronized
  documentation. Preserve the
  frozen candidate and unrelated user work. Do not publish, recruit, or run a
  qualifying implementation.
"""

let repository_change_summary = session """
  Summarize the task-owned files and local-only decisions in the integrated
  repository_root={repository_root}. Include the baseline_ref, frozen_candidate,
  excluded dirty-state record, and any local task-only commit. Do not claim
  publication, independence, public review, promotion, adoption, or financial
  correctness.
"""

let acceptance_manifest = session """
  Build a durable acceptance manifest for the integrated repository_root={repository_root}.
  Record the actual graph, exact commands and results, frozen-byte fingerprints,
  evidence locations, skipped or blocked external checks, and remaining risks.
  Preserve local versus packaged versus public and independent evidence states.
"""

let independent_verifier_report = session """
  Read the integrated task diff and candidate boundary independently from the
  candidate boundary report {candidate_boundary_report} and acceptance manifest
  {acceptance_manifest}. Run the
  complete acceptance review and batch all findings without editing. Check
  frozen-byte preservation, fail-closed anchors, unsafe output rejection,
  deterministic scaffolding, evidence-state boundaries, documentation
  synchronization, and local verification results.
"""

return {
  candidate_boundary_report,
  qualification_campaign_bundle,
  repository_change_summary,
  acceptance_manifest,
  independent_verifier_report,
  external_action_checkpoint: "public-authenticated-anchor-and-human-review-pending"
}
```
