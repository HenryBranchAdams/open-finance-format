# Clean-room producer and Core-authoring task

## Purpose

Determine whether an unaffiliated implementer can produce conforming OFF packages from public materials only. This task has two separate exercises: a timed minimal Core package and a distinct Traceable Public Equity package.

Do not edit a reference package, add a fixture to the reference corpus, or ask OFF's authors for private guidance. Do not inspect `src/` or use implementation details discovered by reading, disassembling, tracing, or otherwise reverse-engineering `dist/off.mjs` as authoring guidance. The bundled validator may be executed only as an opaque evaluator under the procedures below.

## Exercise A — ten-minute Core author

Use only the public OFF Core specification, Core schema, minimal reference package, and published release materials.

1. Start the timer before creating files.
2. Create a new package directory containing off.json and one local human-readable entrypoint.
3. Use new package, release, author, and resource identifiers.
4. Declare the entrypoint's exact byte size and raw SHA-256 digest.
5. Stop the timer when the reference validator first returns a valid Core result.
6. Record elapsed seconds, all validator attempts, repairs, and the final package digest.

The gate requires a first-time author to finish in ten minutes or less. Prior OFF authoring or private coaching disqualifies the timed evidence. This timed exercise may use validator diagnostics for repairs, but every attempt and change must remain in the public evidence log.

Validate with a fixed timestamp:

    node dist/off.mjs validate <new-core-package> --evaluated-at <whole-second-UTC-timestamp>

## Exercise B — distinct Traceable Public Equity producer

Create a distinct, synthetic Traceable Public Equity package from scratch. It must not reuse the identity, values, prose, or artifact bytes of conformance/packages/public-equity-traceable.

The package must:

- conform to OFF Core 0.1 and declare OFF Public Equity Research 0.1;
- contain at least one new security, scenario, unit, source, source fact, analyst assumption, and headline output;
- bind each headline output to a locally hashed source artifact;
- provide a human-readable methodology;
- declare a complete material dependency path from each headline to sourced facts or analyst assumptions;
- bind the author attestation to the exact artifact digest;
- report Traceable — author-declared lineage with attested-not-independently-verified completeness; and
- choose explicit freshness thresholds that can be tested immediately before and at a stale boundary.

Before invoking the reference validator for the first time:

1. Finish the complete package using only the public specification, schemas, examples, and release materials.
2. Record the recursive file inventory, exact raw SHA-256 digest of every file, package-tree digest procedure, and freeze timestamp.
3. Publish or otherwise preserve an immutable copy of those exact pre-validation bytes.

The first reference-validator result at each required timestamp, against the same frozen bytes, is the producer evidence. Do not modify the frozen package between evaluations or in response to validator diagnostics and then claim the repaired package as a successful clean-room production result. A structural rejection at either timestamp ends this attempt: preserve the rejected bytes and diagnostics, mark the producer result failed, and record whether the cause was an author error or an ambiguity in the public contract. An ambiguity requiring clarification must be resolved in a new immutable release candidate before testing restarts. An attempt that failed through author error may be retried against the same candidate only by a new eligible implementer starting from public materials without guidance from the failed attempt. An evaluator or environment failure that did not interpret the package may be rerun only if both the failure and rerun are recorded.

Validate the package at both fixed timestamps:

    node dist/off.mjs validate <new-public-equity-package> --evaluated-at <current-timestamp> --profile https://openfinanceformat.org/profiles/public-equity-research/0.1
    node dist/off.mjs validate <new-public-equity-package> --evaluated-at <stale-timestamp> --profile https://openfinanceformat.org/profiles/public-equity-research/0.1

The structural profile result must pass at both timestamps. Expected freshness warnings do not invalidate the package.

## Required evidence

Publish:

- the complete new packages and their raw-file digests;
- the exact commands and runtime versions;
- canonical normalized output from both evaluations;
- the ordered diagnostics, resolved lineage, and freshness states;
- proof that the producer package IDs and artifact bytes are distinct from the references;
- the frozen pre-validation inventory, digests, timestamp, and first validator result at each required timestamp;
- attestations that the producer used public materials only, did not inspect `src/`, did not reverse-engineer `dist/off.mjs`, and received no private guidance;
- the timed Core-authoring duration and attempt log; and
- every ambiguity or repair required by the public instructions.

The reference validator is an oracle for acceptance, not an authoring source. A Traceable package that passes only after validator-guided repair or undocumented advice does not satisfy this task. Timed Core attempts remain a separate usability measure and must disclose their validator-guided repairs.

## Ambiguity rule

If public materials are insufficient, stop and record the gap. Any private clarification requires OFF to publish a new immutable release candidate and restart both producer exercises from public materials.

## Completion bar

The producer gate is eligible for public review only when the distinct, frozen Traceable Public Equity package is accepted on its first structural evaluation without private clarification. The separate Core-authoring gate is eligible only when an eligible first-time user completes it within ten minutes. Until public human review, completed results are author-claimed evidence, not certified facts. The rc.1 automated release validator cannot certify either gate or promote the format. Neither result establishes adoption, independent lineage review, or financial correctness.
