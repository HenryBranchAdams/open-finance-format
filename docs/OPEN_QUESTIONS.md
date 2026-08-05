# Open questions and evidence queue

The v0.1-rc.1 semantic boundary is settled. The remaining release questions concern public evidence, ambiguity handling, and later product work; they must not silently expand rc.1.

## Settled boundaries

- off.json is the sole normative package source.
- v0.1-rc.1 defines only OFF Core 0.1 and OFF Public Equity Research 0.1.
- The highest Public Equity claim is **Traceable — author-declared lineage**; completeness is attested and not independently verified.
- Structural conformance makes no network requests. Remote resources are descriptors whose availability and integrity are not evaluated.
- The normalized representation, diagnostic ordering, lineage resolution, and freshness results are deterministic at fixed timestamps.
- Narrative conventions, presentation metadata, renderers, and authoring tools are non-normative. Workbook Binding is a post-rc.1 development profile.
- Execution, interactive recalculation, independently reviewed lineage, other asset classes, hosted registry and social behavior, and adoption requirements are deferred.
- XBRL may be referenced as opaque evidence through an illustrative locator, but XBRL processing is outside rc.1.

## Promotion evidence

| Gate | Current state | Evidence required |
|---|---|---|
| Independent consumer | **Pending** | An unaffiliated implementation in another language reproduces the public normalized outputs, diagnostics, lineage, and fixed-time freshness. |
| Independent producer | **Pending** | Using only public materials, an unaffiliated implementer authors a new Public Equity Research package accepted by the reference validator. |
| Ten-minute Core author | **Pending** | A first-time user creates the minimal Core package in ten minutes or less from public instructions. |
| Immutable public anchor | **Pending** | The release records a public VCS commit and checksum-manifest digest before a clean-room attempt begins. |
| Public evidence review | **Pending** | A named reviewer checks the immutable consumer, producer, authoring, independence, and authentication evidence. |

No v0.1 promotion or independent interoperability claim is available until all required public evidence is complete and reviewed. Automated rc.1 validation checks artifact consistency only and cannot certify promotion.

The local [qualification launchpad](QUALIFICATION_LAUNCHPAD.md) closes the
repository-preparation gap while leaving the immutable public anchor,
unaffiliated execution, and named public review explicitly pending.

## Clean-room ambiguity process

The key operational question is whether a clean-room implementer finds any requirement that cannot be resolved from public specification text, schemas, corpus fixtures, and expected outputs.

If private clarification is requested:

1. record the ambiguity and affected rule publicly;
2. revise the normative material or fixture in a new immutable release candidate;
3. regenerate affected checksums and expectations; and
4. restart the clean-room attempt from public materials.

The previous candidate is not patched in place or retroactively credited with a pass.

## Questions after interoperability

### External design partner

- Which independent public-markets analyst will attempt the first real package?
- Will the partner publish a new model, convert an existing workbook, or consume someone else's package?
- What baseline should be used to measure authoring time and repair burden?

Adoption evidence is pending this external real-model exercise and must remain separate from format conformance.

### Authoring and conversion

- Which optional template or agent workflow most reduces time to a valid off.json?
- How should spreadsheet mappings preserve stable IDs when workbook layout changes?
- Which validator repairs are safe to automate, and which require an author's judgment?

Generated files must prove their correctness by producing the same conforming manifest; no authoring system becomes a second normative authority.

### Lifecycle and refresh

- What interval should define successful remediation after a material input becomes stale?
- Which notification and comparison tools help an author issue a new immutable release?
- How should publishers report stale-input remediation while preserving privacy?

Freshness policy and propagation are already normative. Monitoring, notification, and publication workflows are product decisions.

### Presentation and multi-rendering

- Which illustrative narrative and layout conventions improve mobile inspection?
- Which independent renderers should participate in the first real-model milestone?
- What accessibility and native-artifact checks belong in product acceptance rather than format conformance?

### Future evidence levels

- What public evidence would justify tool-extracted lineage?
- What review procedure would justify an independently reviewed lineage claim?
- How would those levels bind to immutable artifacts without weakening the rc.1 author-attestation boundary?

### Governance evolution and licensing

- Which sustained independent implementers should gain maintainer or proposal
  authority after the founder-led phase?
- What evidence should trigger an independent steering group or foundation?
- When, if ever, should monetization or platform branding be formalized?

The initial founder-led authority, public proposal lifecycle, compatibility
policy, and immutable decision records are now defined. Broader governance
remains deferred until independent interoperability and early adoption provide
evidence that it is warranted.
