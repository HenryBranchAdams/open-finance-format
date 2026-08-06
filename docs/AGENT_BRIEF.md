# Agent brief

You are continuing work on **Open Finance Format (OFF)**, an open standard for publishing financial models as portable, versioned, source-backed research objects.

The repository preserves the experimental `v0.1-rc.1` interoperability
candidate and now contains mutable post-rc.1 development. Do not treat the
current top-level tree as the frozen candidate when its bytes differ.

## Read first

Use this authority order:

1. [Specification index](../spec/INDEX.md)
2. [OFF Core 0.1](../spec/OFF-Core-0.1.md)
3. [OFF Public Equity Research 0.1](../spec/profiles/public-equity-research-0.1.md)
4. [Normalization 0.1](../spec/normalization-0.1.md)
5. [Diagnostics 0.1](../spec/diagnostics-0.1.md)
6. [Conformance 0.1](../spec/conformance-0.1.md)
7. [Rule registry](../spec/rules-0.1.json) and [protocol catalog](../protocol/catalog-0.1.json)
8. [Layered conformance corpus](../conformance/corpus.json)
9. [Current handoff](handoff.yaml)

Use [STRATEGY.md](../STRATEGY.md) for product intent and [PROJECT_BRIEF.md](PROJECT_BRIEF.md) for the standard/platform boundary. Treat DECISIONS.md, SPEC_V0_1_DRAFT.md, DESIGN.md, RESEARCH.md, and the implementation plan as historical context where they conflict with the implemented contract.

## Locked rc.1 contract

- off.json is the sole normative manifest. Narrative files, templates, generators, spreadsheets, and presentation metadata cannot override it.
- v0.1-rc.1 defines exactly two normative profiles: **OFF Core 0.1** and **OFF Public Equity Research 0.1**.
- The highest Public Equity claim is **Traceable — author-declared lineage**. Structural conformance and the author's completeness attestation are reported separately.
- Core is finance-agnostic. Public-equity concepts exist only in the optional declared profile.
- Conformance evaluation is offline and makes no network requests. Remote resources are inventory descriptors and remain not evaluated.
- Normalized output, diagnostic ordering, resolved lineage, and freshness at a fixed timestamp are deterministic.
- Valid, valid-with-warnings, invalid, and host evaluator failures are distinct results.
- XBRL integration is limited to the [illustrative evidence locator](../spec/examples/xbrl-source-locator.md); rc.1 does not parse or validate XBRL.

## Claims boundary

Do not describe local reference tests as proof of independent interoperability. Promotion to v0.1 remains blocked on:

- an unaffiliated consumer in another language;
- an unaffiliated producer of a newly conforming package; and
- a first-time author completing the minimal Core package in ten minutes or less.

All three evidence items are pending, as are their public human review and the candidate's public authentication anchors. The rc.1 validator cannot certify promotion. OFF also makes no adoption, investment-quality, financial-correctness, independent-lineage-review, formula-execution, or exact-reproduction claim.

Any ambiguity that requires private clarification must be resolved publicly in a new immutable release candidate before the clean-room attempt restarts.

## Work boundaries

Match the requested lane:

- For specification or contract changes, update normative text, schemas, rule registry, fixtures, expected canonical output, and tests as one coherent unit.
- For reference implementation changes, preserve offline behavior, deterministic results, stable diagnostics, host-path sanitization, and the distinction between package invalidity and evaluator failure.
- For documentation changes, point to current normative authority and do not revive superseded authoring or presentation contracts.
- For clean-room work, use only the public release materials and record gaps instead of asking OFF's authors for private conventions.
- For adoption or product exploration, keep the result non-normative unless a later scoped profile is explicitly approved.

Presentation conventions remain illustrative and deferred. Execution and
recalculation are deferred. Social discovery and hosted-registry behavior are
deferred; the checked-in offline protocol catalogs are implemented. Adoption
evidence remains pending.

## Verification

Run the narrowest relevant check first, then the complete local development
gate:

    pnpm verify

Its component commands are:

    pnpm build
    pnpm check
    pnpm test
    pnpm test:node22
    pnpm test:offline
    pnpm release:self-check

Report which checks actually ran. `pnpm release:self-check` trusts the current checkout's verifier and confirms internal candidate consistency only; it neither authenticates the checkout nor completes any external gate. Validate an untrusted candidate only with a separately authenticated verifier outside the candidate root.

## Next evidence-producing task

Once the candidate is bound to immutable public release artifacts, recruit an unaffiliated implementer and run the published consumer and producer tasks without private clarification. Record any ambiguity publicly, issue a new candidate when required, and leave every success field pending until the corresponding evidence has been reviewed.
