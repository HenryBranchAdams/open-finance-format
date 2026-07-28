# OFF decision records

This directory preserves final dispositions for OFF Change Proposals and other
material governance decisions. A decision explains why authority changed; it
does not override the immutable bytes of a published candidate.

Copy [`0000-template.md`](0000-template.md), assign the next four-digit number,
and link the applicable [proposal](../../proposals/README.md). The current
founder-maintainer is the named decider unless governance has changed publicly.

Accepted and rejected proposals require a decision record. Withdrawals retain
their proposal rationale; a maintainer may add a decision when the withdrawal
itself has lasting policy effect. The record should capture evidence,
compatibility, security/privacy effects, dissent, and exactly which development
or future-release boundary it affects.

Once merged, a decision record is append-only and its original disposition is
immutable. Do not rewrite rationale when facts change. Publish a new numbered
decision that cites and supersedes the old record; use an explicit errata record
for clerical corrections. Git history is useful evidence but is not a substitute
for an understandable record in this directory.

`v0.1-rc.1` cannot be amended by a decision. An accepted change appears first in
the mutable development tree and gains release authority only through a newly
identified immutable candidate.
