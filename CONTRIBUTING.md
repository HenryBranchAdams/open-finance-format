# Contributing to Open Finance Format

OFF welcomes specification review, independent implementations, test vectors,
security analysis, documentation, and reference-tool improvements.

Start with the [repository status and routes](README.md), the
[specification index](spec/INDEX.md), and the [implementer guide](docs/IMPLEMENTERS.md).
By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Choose the right path

- Use a focused pull request for editorial fixes, tests, examples, or reference
  implementation changes that preserve normative behavior.
- Start an [OFF Change Proposal](proposals/README.md) for new or changed
  normative behavior, profiles, compatibility or deprecation rules, stable
  diagnostics, security boundaries, conformance requirements, or governance.
- Follow [SECURITY.md](SECURITY.md) for vulnerabilities. Do not disclose
  exploit details in an issue or proposal.
- Follow the frozen [clean-room tasks](clean-room/CONSUMER_TASK.md) when
  producing independent interoperability evidence. Ordinary contributions do
  not count as unaffiliated clean-room evidence.

## Working agreement

Keep changes small and evidence-bound. Do not modify
`release/v0.1-rc.1/**` or regenerate its checksums: rc.1 is immutable. Changes
after rc.1 belong to the mutable development tree and must not be described as
a new release until a separately identified candidate is published.

Normative requirements belong in `spec/`, input shapes in `schemas/`, and
stable rule assignments in `spec/rules-0.1.json`. Reference code and `dist/`
must follow those artifacts; they are not an alternate source of protocol
authority. Internet-hosted schema and profile URI resolution is not currently a
conformance dependency.

Before opening a pull request:

1. Explain the problem, intended behavior, and compatibility effect.
2. Add focused tests or conformance vectors when observable behavior changes.
3. Run the narrowest relevant checks, then `pnpm verify` when dependencies and
   the supported Node 22 runtime are available.
4. State what was run, what remains unverified, and whether the change affects
   only development or proposes a future candidate.

Do not mix unrelated cleanup into a protocol change. Do not claim independent
interoperability, adoption, source truth, analytical quality, or financial
correctness from repository tests.

## Review and authorship

The current founder-maintainer makes final merge and proposal decisions under
[GOVERNANCE.md](GOVERNANCE.md). Reviews should address the work rather than the
person. Contributors retain authorship of their commits and contribute under
the repository's [Apache-2.0 license](LICENSE).
