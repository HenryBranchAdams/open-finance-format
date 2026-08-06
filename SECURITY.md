# Security policy

OFF processes packages and resources that may be untrusted. The normative
development requirements and residual risks are collected in
[Security and privacy considerations](spec/security-privacy-considerations.md).

## Reporting a vulnerability

Do not post exploit details, malicious packages, credentials, or private data
in a public issue, discussion, pull request, or OFF Change Proposal.

GitHub private vulnerability reporting was not enabled for this repository when
checked on 2026-07-27. If the repository's **Security** page later offers a
**Report a vulnerability** control, use it; GitHub Security Advisories can then
support private maintainer collaboration. Until a private control is available,
use an already-known private maintainer contact, or open only a minimal public
request asking for a private channel. That request must contain no sensitive
technical detail.

This repository does not currently publish a dedicated security email address,
encrypted intake key, response-time commitment, or disclosure SLA. Do not infer
one. If no safe private channel is available, retain the details until one is
established rather than publishing them.

Include, through the private channel when available:

- the affected artifact, version or commit, and environment;
- impact and the smallest reproducible description;
- whether untrusted input, network access, or user interaction is required; and
- suggested mitigations, if known.

The maintainer will coordinate validation, remediation, and disclosure without
promising a fixed timeline. A security fix that changes normative behavior
must be documented publicly when safe and released in a new candidate; frozen
rc.1 bytes are never silently patched.

## Supported artifacts

The current development branch receives security fixes. `v0.1-rc.1` remains an
immutable experimental interoperability candidate: findings may be documented
against it, but remediation is published only in a later candidate or version.
No hosted OFF service or URI-resolution service is claimed by this repository.
