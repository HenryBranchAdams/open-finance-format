---
name: off-clean-room-qualification-contract-test
kind: test
subject: prepare-off-clean-room-qualification
---

### Fixtures

- `repository_root`: the isolated OFF worktree used for the implementation
- `baseline_ref`: the revalidated local development commit
- `frozen_candidate`: the v0.1-rc.1 label, pinned Git snapshot, release bytes, allowlist, checksums, and pending interoperability record
- `authority`: local-only authority with publication, recruitment, credentials, and public review excluded

### Expects

- `candidate_boundary_report`: identifies the mutable checkout as unsuitable as the rc.1 candidate root and preserves the frozen snapshot boundary
- `qualification_campaign_bundle`: creates only an external attempt directory, copies the authenticated candidate materials and tasks, and records local-preflight versus public-pending evidence states
- `qualification_campaign_bundle`: rejects pending anchors, mismatched commits, mismatched checksum digests, dirty candidate checkouts, existing output directories, and output paths inside the candidate repository
- `qualification_campaign_bundle`: a missing pinned snapshot produces `frozen_candidate_unavailable`
- `qualification_campaign_bundle`: a public-contract ambiguity records `public_contract_ambiguity` without patching rc.1
- `acceptance_manifest`: records exact local checks, skipped external evidence, and the external-action checkpoint
- `external_action_checkpoint`: publication or recruitment returns `authority_required` or an equivalent checkpoint without causing the effect

### Expects Not

- `qualification_campaign_bundle`: edits release/v0.1-rc.1, the in-place interoperability template, or unrelated dirty work
- `qualification_campaign_bundle`: runs a consumer, producer, validator, network operation, publication, recruitment, or credentialed action
- `qualification_campaign_bundle`: lets a local rehearsal populate qualifying evidence states
- `acceptance_manifest`: claims independent interoperability, public authentication, public review, promotion, adoption, or financial correctness
