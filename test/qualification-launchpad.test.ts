import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  CANDIDATE,
  QualificationLaunchpadError,
  prepareQualificationLaunchpad,
} from "../tools/qualification-launchpad.mjs";

const execute = promisify(execFile);
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const checksumRelativePath = "release/v0.1-rc.1/checksums.json";
const reportRelativePath = "clean-room/INTEROPERABILITY_REPORT.template.md";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function candidateFixture(t: test.TestContext): Promise<{
  readonly parent: string;
  readonly root: string;
  readonly frozenCommit: string;
  readonly checksumManifestSha256: string;
}> {
  const parent = await mkdtemp(join(tmpdir(), "off-launchpad-candidate-"));
  t.after(async () => rm(parent, { recursive: true, force: true }));
  const root = join(parent, "candidate");
  const handoff = await readFile(join(repositoryRoot, "docs/handoff.yaml"), "utf8");
  const frozenCommit = handoff.match(
    /pinned_git_snapshot:\s*([0-9a-f]{40})/u,
  )?.[1];
  assert.ok(frozenCommit, "handoff must identify the frozen candidate commit");
  await execute("git", ["clone", "--quiet", "--no-local", repositoryRoot, root]);
  await execute("git", ["-C", root, "checkout", "--quiet", frozenCommit]);
  const checksumManifestSha256 = sha256(
    await readFile(join(root, checksumRelativePath)),
  );
  return { parent, root, frozenCommit, checksumManifestSha256 };
}

function input(
  fixture: {
    readonly root: string;
    readonly frozenCommit: string;
    readonly checksumManifestSha256: string;
  },
  outputRoot: string,
) {
  return {
    candidateRoot: fixture.root,
    publicCommit: fixture.frozenCommit,
    checksumManifestSha256: fixture.checksumManifestSha256,
    outputRoot,
    createdAt: "2026-08-04T12:00:00Z",
  };
}

async function launchpadError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.equal(error instanceof QualificationLaunchpadError, true);
    assert.equal((error as QualificationLaunchpadError).code, code);
    return true;
  });
}

test("pending external anchors fail closed before creating an attempt", async (t) => {
  const fixture = await candidateFixture(t);
  const output = join(fixture.parent, "pending-attempt");
  await launchpadError(
    prepareQualificationLaunchpad({
      ...input(fixture, output),
      publicCommit: "pending",
    }),
    "external_anchor_pending",
  );
  await assert.rejects(stat(output));
});

test("commit and checksum mismatches fail closed", async (t) => {
  const fixture = await candidateFixture(t);
  await launchpadError(
    prepareQualificationLaunchpad({
      ...input(fixture, join(fixture.parent, "wrong-commit")),
      publicCommit: "0000000000000000000000000000000000000000",
    }),
    "frozen_candidate_drift",
  );
  await launchpadError(
    prepareQualificationLaunchpad({
      ...input(fixture, join(fixture.parent, "wrong-digest")),
      checksumManifestSha256: "0000000000000000000000000000000000000000000000000000000000000000",
    }),
    "checksum_digest_mismatch",
  );
});

test("allowlisted candidate and clean-room bytes are checked before copying", async (t) => {
  const taskFixture = await candidateFixture(t);
  await writeFile(join(taskFixture.root, "clean-room/CONSUMER_TASK.md"), "tampered task\n");
  await execute("git", ["-C", taskFixture.root, "add", "clean-room/CONSUMER_TASK.md"]);
  await execute("git", [
    "-C",
    taskFixture.root,
    "-c",
    "user.name=OFF test",
    "-c",
    "user.email=off-test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "tampered task fixture",
  ]);
  const taskCommit = (await execute("git", ["-C", taskFixture.root, "rev-parse", "HEAD"])).stdout.trim();
  await launchpadError(
    prepareQualificationLaunchpad({
      ...input(taskFixture, join(taskFixture.parent, "tampered-task")),
      publicCommit: taskCommit,
    }),
    "frozen_candidate_drift",
  );

  const releaseFixture = await candidateFixture(t);
  await writeFile(join(releaseFixture.root, "release/v0.1-rc.1/README.md"), "tampered release\n");
  await execute("git", ["-C", releaseFixture.root, "add", "release/v0.1-rc.1/README.md"]);
  await execute("git", [
    "-C",
    releaseFixture.root,
    "-c",
    "user.name=OFF test",
    "-c",
    "user.email=off-test@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "tampered release fixture",
  ]);
  const releaseCommit = (await execute("git", ["-C", releaseFixture.root, "rev-parse", "HEAD"])).stdout.trim();
  await launchpadError(
    prepareQualificationLaunchpad({
      ...input(releaseFixture, join(releaseFixture.parent, "tampered-release")),
      publicCommit: releaseCommit,
    }),
    "frozen_candidate_drift",
  );

  const indexFixture = await candidateFixture(t);
  await writeFile(join(indexFixture.root, "clean-room/CONSUMER_TASK.md"), "index-hidden tamper\n");
  await execute("git", [
    "-C",
    indexFixture.root,
    "update-index",
    "--assume-unchanged",
    "clean-room/CONSUMER_TASK.md",
  ]);
  await launchpadError(
    prepareQualificationLaunchpad(input(indexFixture, join(indexFixture.parent, "index-hidden"))),
    "frozen_candidate_drift",
  );
});

test("dirty candidates, unsafe paths, and existing outputs are rejected", async (t) => {
  const fixture = await candidateFixture(t);
  await execute("git", ["-C", fixture.root, "config", "status.showUntrackedFiles", "no"]);
  await writeFile(join(fixture.root, "untracked-attempt-note.txt"), "not candidate evidence\n");
  await launchpadError(
    prepareQualificationLaunchpad(input(fixture, join(fixture.parent, "dirty"))),
    "candidate_checkout_dirty",
  );

  const ignoredFixture = await candidateFixture(t);
  await mkdir(join(ignoredFixture.root, "node_modules/ignored"), { recursive: true });
  await writeFile(join(ignoredFixture.root, "node_modules/ignored/file.js"), "ignored\n");
  await launchpadError(
    prepareQualificationLaunchpad(input(ignoredFixture, join(ignoredFixture.parent, "ignored"))),
    "candidate_checkout_dirty",
  );

  const cleanFixture = await candidateFixture(t);
  await launchpadError(
    prepareQualificationLaunchpad(
      input(cleanFixture, join(cleanFixture.root, "attempt")),
    ),
    "unsafe_output_path",
  );

  const existing = join(cleanFixture.parent, "existing");
  await writeFile(existing, "not a directory\n");
  await launchpadError(
    prepareQualificationLaunchpad(input(cleanFixture, existing)),
    "output_exists",
  );
});

test("the launchpad creates deterministic external scaffolding and preserves the candidate template", async (t) => {
  const fixture = await candidateFixture(t);
  const before = await readFile(join(fixture.root, reportRelativePath));
  const first = await prepareQualificationLaunchpad(
    input(fixture, join(fixture.parent, "attempt-one")),
  );
  const second = await prepareQualificationLaunchpad(
    input(fixture, join(fixture.parent, "attempt-two")),
  );

  assert.equal(first.kind, "offQualificationLaunchpad");
  assert.equal(first.candidate, CANDIDATE);
  assert.deepEqual(first.manifest, second.manifest);
  assert.deepEqual(
    await readFile(join(first.outputRoot, "launchpad.json")),
    await readFile(join(second.outputRoot, "launchpad.json")),
  );
  assert.deepEqual(
    await readFile(join(first.outputRoot, "qualification-sequence.md")),
    await readFile(join(second.outputRoot, "qualification-sequence.md")),
  );
  assert.deepEqual(
    await readdir(join(first.outputRoot, "tasks")),
    ["CONSUMER_TASK.md", "INTEROPERABILITY_REPORT.template.md", "PRODUCER_TASK.md"],
  );
  assert.equal(first.manifest.authentication.localPreflight, "verified");
  assert.equal(first.manifest.authentication.publicVcsCommit, "pending");
  assert.equal(first.manifest.authentication.checksumManifestDigest, "pending");
  assert.equal(first.manifest.independence, "pending");
  assert.equal(first.manifest.gates.independentConsumer, "pending");
  assert.equal(first.manifest.gates.independentProducer, "pending");
  assert.equal(first.manifest.gates.tenMinuteCoreAuthoring, "pending");
  assert.deepEqual(await readFile(join(fixture.root, reportRelativePath)), before);
});
