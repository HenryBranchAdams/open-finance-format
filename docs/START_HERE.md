# Open Finance Format project guide

Status: v0.1-rc.1 implementation authorized
Prepared: 2026-07-17
Name: **Open Finance Format (OFF)**

> Current authority: [`../STRATEGY.md`](../STRATEGY.md), the [implementation-ready plan](plans/2026-07-17-001-feat-off-v0-1-layered-conformance-corpus-plan.md), and the normative contracts under [`../spec/`](../spec/). Earlier planning files remain as history and are superseded wherever they conflict.

## One-sentence concept

Open Finance Format (OFF) is a proposed open, Git-native format for publishing financial models as portable, versioned, source-backed research objects that people, agents, spreadsheets, and web applications can inspect, cite, render, challenge, and eventually fork.

## Why this package exists

This directory preserves the product and standards work that led to the current rc.1 contract. Implementation is now authorized under the implementation-ready plan.

## Read in this order

1. `../README.md` — repository status and normative navigation.
2. `../spec/OFF-Core-0.1.md` — normative Core contract.
3. `../spec/profiles/public-equity-research-0.1.md` — normative Public Equity contract.
4. `plans/2026-07-17-001-feat-off-v0-1-layered-conformance-corpus-plan.md` — implementation contract.
5. The remaining files here — historical product, design, research, and roadmap context.

`handoff.yaml` is the machine-readable index for this package.

## Current strategic conclusion

The wedge is **not** “host an Excel file.” The wedge is making public financial research portable, auditable, freshness-aware, citeable, and socially forkable.

The standard should describe the publishing wrapper around a model without attempting to replace Excel or define a universal formula language in v0.1. The future platform should consume the standard, not own it.

## Immediate objective

Implement and verify the experimental v0.1-rc.1 specification, schemas, two-package layered conformance corpus, reference validator, and offline clean-room harness. Rendering and adoption validation remain later milestones.

## Important boundary

Structural conformance must never imply that an investment thesis is correct, unbiased, or suitable for investment. A validator may establish facts such as “manifest valid,” “sources declared,” or “normalized results reproducible at a fixed evaluation timestamp.” It must not award an “accurate valuation” badge.
