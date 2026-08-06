# Open Finance Format project guide

Status: mutable post-v0.1-rc.1 development; frozen candidate preserved
Prepared: 2026-07-17; updated: 2026-07-27
Name: **Open Finance Format (OFF)**

> Current authority: [`../STRATEGY.md`](../STRATEGY.md), the
> [specification index](../spec/INDEX.md), and the public
> [governance process](../GOVERNANCE.md). The pinned Git snapshot and release
> manifest govern frozen rc.1; the top-level specifications govern only the
> mutable development snapshot. Earlier planning files remain history.

## One-sentence concept

Open Finance Format (OFF) is a proposed open, Git-native format for publishing financial models as portable, versioned, source-backed research objects that people, agents, spreadsheets, and web applications can inspect, cite, render, challenge, and eventually fork.

## Why this package exists

This directory preserves the product and standards work that led to the current rc.1 contract. Implementation is now authorized under the implementation-ready plan.

## Read in this order

1. `../README.md` — repository status and navigation.
2. `../spec/INDEX.md` — frozen-versus-development authority map.
3. `IMPLEMENTERS.md` — offline implementation and clean-room boundaries.
4. `../GOVERNANCE.md` — founder-led proposal and release authority.
5. `PUBLICATION.md` — non-normative rc.1 publication procedure.
6. The remaining files here — product, design, research, roadmap, and history.

`handoff.yaml` is the machine-readable index for this package.

## Current strategic conclusion

The wedge is **not** “host an Excel file.” The wedge is making public financial research portable, auditable, freshness-aware, citeable, and socially forkable.

The standard should describe the publishing wrapper around a model without attempting to replace Excel or define a universal formula language in v0.1. The future platform should consume the standard, not own it.

## Immediate objective

Preserve the frozen rc.1 evidence boundary while making the mutable protocol
independently discoverable, safer to implement, publicly governable, and easier
to author. The next release claim still depends on authenticated publication
and unaffiliated clean-room evidence; rendering and adoption remain later work.

## Important boundary

Structural conformance must never imply that an investment thesis is correct, unbiased, or suitable for investment. A validator may establish facts such as “manifest valid,” “sources declared,” or “normalized results reproducible at a fixed evaluation timestamp.” It must not award an “accurate valuation” badge.
