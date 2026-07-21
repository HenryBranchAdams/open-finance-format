import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const markdownPaths = [
  "README.md",
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

  assert.match(readme, /does not claim[^\n]*financial correctness/iu);
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
