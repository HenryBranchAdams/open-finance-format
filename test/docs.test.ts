import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const markdownPaths = [
  "README.md",
  "GOVERNANCE.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "spec/INDEX.md",
  "spec/terminology.md",
  "spec/versioning.md",
  "spec/security-privacy-considerations.md",
  "spec/schema-resources-0.1.md",
  "docs/IMPLEMENTERS.md",
  "protocol/README.md",
  "proposals/README.md",
  "proposals/0000-template.md",
  "docs/decisions/README.md",
  "docs/decisions/0000-template.md",
  "docs/START_HERE.md",
  "docs/PUBLICATION.md",
  "docs/AGENT_BRIEF.md",
  "docs/PROJECT_BRIEF.md",
  "docs/ROADMAP.md",
  "docs/OPEN_QUESTIONS.md",
  "release/v0.1-rc.1/README.md",
  "clean-room/CONSUMER_TASK.md",
  "clean-room/PRODUCER_TASK.md",
  "clean-room/INTEROPERABILITY_REPORT.template.md",
  "CONCEPTS.md",
  "docs/solutions/architecture-patterns/separating-local-conformance-from-clean-room-interoperability.md",
] as const;

async function readRepositoryFile(path: string): Promise<string> {
  return readFile(resolve(repositoryRoot, path), "utf8");
}

async function readPublicGuidance(): Promise<string> {
  const documents = await Promise.all([
    ...markdownPaths.map(readRepositoryFile),
    readRepositoryFile("docs/handoff.yaml"),
  ]);
  return documents.join("\n");
}

test("public guidance describes the implemented experimental rc.1 contract", async () => {
  const readme = await readRepositoryFile("README.md");
  const projectBrief = await readRepositoryFile("docs/PROJECT_BRIEF.md");
  const roadmap = await readRepositoryFile("docs/ROADMAP.md");

  for (const document of [readme, projectBrief, roadmap]) {
    assert.match(document, /v0\.1-rc\.1/u);
    assert.match(document, /off\.json/u);
    assert.match(document, /OFF Core 0\.1/u);
    assert.match(document, /OFF Public Equity Research 0\.1/u);
    assert.match(document, /Traceable/u);
    assert.match(document, /author-declared lineage/u);
  }

  assert.match(readme, /conformance\/corpus\.json/u);
  assert.match(readme, /offline/u);
  assert.match(readme, /XBRL source-locator note/u);
  assert.match(projectBrief, /exactly two normative profiles/u);
  assert.match(projectBrief, /sole normative package source/u);
});

test("owned guidance contains none of the superseded planning contracts", async () => {
  const guidance = await readPublicGuidance();
  const contradictions = [
    /implementation_authorized:\s*false/u,
    /planning_only_until_authorized/u,
    /Remain in planning mode/u,
    /Only begin with explicit implementation authorization/u,
    /model-manifest\.json/u,
    /MODEL\.md/u,
    /Presentation Profile/u,
    /\bAuditable\b/u,
    /structured_traceable_auditable_package/u,
    /valid_publishable_auditable_executable_levels/u,
    /status:\s*planning/u,
    /subsequent implementation units/u,
    /eventual conformance distribution/u,
  ] as const;

  for (const contradiction of contradictions) {
    assert.doesNotMatch(guidance, contradiction, `superseded guidance: ${contradiction}`);
  }

  assert.match(guidance, /presentation[^\n]*(?:illustrative|deferred)/iu);
  assert.match(guidance, /execution[^\n]*deferred/iu);
  assert.match(guidance, /social[^\n]*deferred/iu);
  assert.match(guidance, /adoption[^\n]*(?:deferred|pending|not claimed)/iu);
});

test("external promotion evidence remains explicitly pending", async () => {
  const readme = await readRepositoryFile("README.md");
  const questions = await readRepositoryFile("docs/OPEN_QUESTIONS.md");
  const handoff = await readRepositoryFile("docs/handoff.yaml");

  assert.match(readme, /does not[\s\S]{0,120}claim[\s\S]{0,120}financial[\s\S]{0,40}correctness/iu);
  assert.match(questions, /independent consumer[^\n]*pending/iu);
  assert.match(questions, /independent producer[^\n]*pending/iu);
  assert.match(questions, /ten-minute[^\n]*pending/iu);
  assert.match(handoff, /independent_consumer:\s*pending/u);
  assert.match(handoff, /independent_producer:\s*pending/u);
  assert.match(handoff, /ten_minute_core_authoring:\s*pending/u);
  assert.match(handoff, /promotion_to_v0_1:\s*not_claimed/u);
  assert.match(handoff, /adoption:\s*not_claimed/u);
  assert.match(handoff, /financial_correctness:\s*not_claimed/u);
});

test("publication guidance preserves the clean-room and authentication boundary", async () => {
  const publication = await readRepositoryFile("docs/PUBLICATION.md");

  assert.match(publication, /does \*\*not\*\* establish independent interoperability/iu);
  assert.match(publication, /embedded external-evidence fields as `pending`/iu);
  assert.match(publication, /SHA-256 of `release\/v0\.1-rc\.1\/checksums\.json`/u);
  assert.match(publication, /exact history-revision URL—not the mutable Gist URL/iu);
  assert.match(publication, /separately controlled authenticated channel/iu);
  assert.match(publication, /declares no context or write credential/iu);
  assert.match(publication, /no injected environment variables or contexts/iu);
  assert.match(publication, /new immutable candidate and restart/iu);
});

test("the handoff declares exactly the two normative v0.1-rc.1 profiles", async () => {
  const handoff = await readRepositoryFile("docs/handoff.yaml");
  assert.match(handoff, /^package: open-finance-format-development-handoff$/mu);
  assert.match(handoff, /^version: 0\.1\.0-dev$/mu);
  assert.match(handoff, /^status: mutable-development$/mu);
  assert.match(handoff, /^frozen_candidate:\n  label: v0\.1-rc\.1$/mu);
  assert.match(
    handoff,
    /^  pinned_git_snapshot: 2570e38998dd735b83da301a5b6f0e95aca47073$/mu,
  );
  const profileBlock = handoff.match(
    /normative_profiles:\n((?:\s+- [^\n]+\n)+)/u,
  );
  assert.notEqual(profileBlock, null);
  const profiles = profileBlock?.[1]
    ?.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-\s+/u, ""));
  assert.deepEqual(profiles, [
    "OFF Core 0.1",
    "OFF Public Equity Research 0.1",
  ]);
  assert.match(handoff, /normative_manifest:\s*off\.json/u);
  assert.match(handoff, /xbrl_evidence_locator:\s*illustrative_only/u);
});

test("governance preserves frozen authority and honest project control", async () => {
  const governance = await readRepositoryFile("GOVERNANCE.md");
  const index = await readRepositoryFile("spec/INDEX.md");
  const versioning = await readRepositoryFile("spec/versioning.md");

  assert.match(governance, /currently a founder-led project/iu);
  assert.match(governance, /current maintainer[\s\S]*final authority/iu);
  assert.match(governance, /does not[\s\S]{0,100}steering committee/iu);
  assert.match(governance, /maintainer bootstrap[\s\S]*do not claim community consensus/iu);
  assert.match(governance, /v0\.1-rc\.1[\s\S]*frozen/iu);
  assert.match(index, /Workbook Binding is not part of rc\.1/iu);
  assert.match(versioning, /v0\.1-rc\.1`? remains byte-for-byte frozen/iu);
  assert.match(versioning, /immutable meanings[\s\S]{0,40}never reassigned/iu);
  assert.match(
    versioning,
    /identifiers,[\s\S]{0,60}not a promise[\s\S]{0,30}live web[\s\S]{0,30}resolution/iu,
  );
});

test("mutable normative documents identify their post-rc.1 status", async () => {
  for (const path of [
    "spec/normalization-0.1.md",
    "spec/diagnostics-0.1.md",
    "spec/conformance-0.1.md",
  ]) {
    const document = await readRepositoryFile(path);
    assert.match(document, /normative development contract after `v0\.1-rc\.1`/u, path);
  }

  const roadmap = await readRepositoryFile("docs/ROADMAP.md");
  const questions = await readRepositoryFile("docs/OPEN_QUESTIONS.md");
  assert.match(roadmap, /protocol operations foundation/iu);
  assert.match(questions, /initial founder-led authority[\s\S]*now defined/iu);
  assert.doesNotMatch(roadmap, /private permissions, governance, monetization/iu);
});

test("the public change process records lifecycle and immutable decisions", async () => {
  const proposals = await readRepositoryFile("proposals/README.md");
  const decisions = await readRepositoryFile("docs/decisions/README.md");

  for (const status of [
    "Draft",
    "Discussion",
    "Accepted",
    "Rejected",
    "Withdrawn",
    "Implemented",
    "Superseded",
  ]) {
    assert.ok(proposals.includes("| `" + status + "` |"));
  }

  assert.match(proposals, /\| `Accepted` \|[^\n]*mutable development[^\n]*Not released/iu);
  assert.match(proposals, /never mutates rc\.1/iu);
  assert.match(decisions, /append-only/iu);
  assert.match(decisions, /original disposition is[\s\S]{0,20}immutable/iu);
  assert.match(decisions, /cannot be amended by a decision/iu);
});

test("implementer guidance keeps clean-room and discovery authority separate", async () => {
  const implementers = await readRepositoryFile("docs/IMPLEMENTERS.md");

  assert.match(implementers, /Only the authenticated frozen public artifacts/iu);
  assert.match(implementers, /Do not combine frozen rc\.1[\s\S]*development files/iu);
  assert.match(implementers, /`src\/`[\s\S]*`dist\/off\.mjs`/u);
  assert.match(implementers, /protocol list/u);
  assert.match(implementers, /protocol explain/u);
  assert.match(implementers, /init core/u);
  assert.match(implementers, /not a live retrieval dependency/iu);
});

test("security guidance covers the protocol threat and privacy boundaries", async () => {
  const reporting = await readRepositoryFile("SECURITY.md");
  const considerations = await readRepositoryFile(
    "spec/security-privacy-considerations.md",
  );

  assert.match(reporting, /private vulnerability reporting was not enabled/iu);
  assert.match(reporting, /Report a vulnerability/iu);
  assert.match(reporting, /no sensitive[\s\S]{0,30}technical detail/iu);
  assert.match(reporting, /does not currently publish a dedicated security email/iu);

  for (const boundary of [
    /untrusted package tree and local resources/iu,
    /Macros, formulas[\s\S]*active content/iu,
    /Renderer injection/iu,
    /Remote URIs[\s\S]*MUST NOT[^\n]*dereference/iu,
    /Extensions and resource exhaustion/iu,
    /Sensitive author, source, and model data/iu,
    /Logs, telemetry, and diagnostics/iu,
  ]) {
    assert.match(considerations, boundary);
  }
  assert.match(considerations, /Wall-clock time is host policy/iu);
  assert.match(considerations, /reference library exposes no deadline or cancellation parameter/iu);
});

test("relative links in the owned Markdown documents resolve locally", async () => {
  for (const markdownPath of markdownPaths) {
    const document = await readRepositoryFile(markdownPath);
    const linkPattern = /\[[^\]]+\]\(([^)]+)\)/gu;
    for (const match of document.matchAll(linkPattern)) {
      const target = match[1]?.trim();
      if (
        target === undefined ||
        target.startsWith("#") ||
        /^[a-z][a-z0-9+.-]*:/iu.test(target)
      ) {
        continue;
      }
      const path = target.split("#", 1)[0] ?? "";
      assert.notEqual(path, "", `${markdownPath}: empty local link`);
      await assert.doesNotReject(
        access(resolve(repositoryRoot, dirname(markdownPath), path)),
        `${markdownPath}: unresolved link ${target}`,
      );
    }
  }
});
