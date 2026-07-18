import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const execute = promisify(execFile);
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const releaseValidator = join(repositoryRoot, "scripts/release-validate.mjs");
const candidateDirectory = join(repositoryRoot, "release/v0.1-rc.1");

interface ReleaseDiagnostic {
  readonly code: string;
  readonly path?: string;
}

interface ReleaseResult {
  readonly kind: "releaseValidation";
  readonly candidate: string;
  readonly ok: boolean;
  readonly evidence: {
    readonly publicVcsCommit: string;
    readonly checksumManifestDigest: string;
    readonly independentConsumer: string;
    readonly independentProducer: string;
    readonly tenMinuteCoreAuthoring: string;
    readonly adoption: string;
  };
  readonly diagnostics: readonly ReleaseDiagnostic[];
}

interface AllowlistDocument {
  readonly files: readonly string[];
  readonly [key: string]: unknown;
}

async function runReleaseValidation(root = repositoryRoot): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly result: ReleaseResult;
}> {
  try {
    const { stdout, stderr } = await execute(
      process.execPath,
      [releaseValidator, "--root", root],
      { cwd: repositoryRoot, maxBuffer: 16 * 1024 * 1024 },
    );
    return {
      exitCode: 0,
      stdout,
      stderr,
      result: JSON.parse(stdout) as ReleaseResult,
    };
  } catch (error) {
    const failure = error as {
      readonly code?: number | string;
      readonly stdout?: string;
      readonly stderr?: string;
    };
    const stdout = failure.stdout ?? "";
    return {
      exitCode: typeof failure.code === "number" ? failure.code : -1,
      stdout,
      stderr: failure.stderr ?? "",
      result: JSON.parse(stdout) as ReleaseResult,
    };
  }
}

async function copyReleaseRoot(t: test.TestContext): Promise<string> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "off-release-test-"));
  t.after(async () => rm(temporaryRoot, { recursive: true, force: true }));
  const allowlist = JSON.parse(
    await readFile(join(candidateDirectory, "files.json"), "utf8"),
  ) as AllowlistDocument;
  for (const relativePath of allowlist.files) {
    const target = join(temporaryRoot, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(repositoryRoot, relativePath), target);
  }
  await symlink(join(repositoryRoot, "node_modules"), join(temporaryRoot, "node_modules"), "dir");
  return temporaryRoot;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}

async function updateDriftChecksum(
  root: string,
  relativePath: string,
): Promise<void> {
  const checksumPath = join(root, "release/v0.1-rc.1/checksums.json");
  const checksums = JSON.parse(await readFile(checksumPath, "utf8")) as {
    files: Record<string, string>;
  };
  const bytes = await readFile(join(root, relativePath));
  checksums.files[relativePath] = createHash("sha256").update(bytes).digest("hex");
  await writeJson(checksumPath, checksums);
}

function diagnosticCodes(result: ReleaseResult): readonly string[] {
  return result.diagnostics.map(({ code }) => code);
}

test("the local rc.1 validates while every external gate remains pending", async () => {
  const validation = await runReleaseValidation();
  assert.equal(validation.exitCode, 0, validation.stdout);
  assert.equal(validation.stderr, "");
  assert.equal(validation.result.kind, "releaseValidation");
  assert.equal(validation.result.candidate, "v0.1-rc.1");
  assert.equal(validation.result.ok, true);
  assert.deepEqual(validation.result.evidence, {
    publicVcsCommit: "pending",
    checksumManifestDigest: "pending",
    independentConsumer: "pending",
    independentProducer: "pending",
    tenMinuteCoreAuthoring: "pending",
    adoption: "pending",
  });
  assert.deepEqual(validation.result.diagnostics, []);
});

test("the allowlist is sorted, safe, complete, and covered by drift checksums", async () => {
  const allowlist = JSON.parse(
    await readFile(join(candidateDirectory, "files.json"), "utf8"),
  ) as {
    readonly candidate: string;
    readonly checksumExclusions: readonly string[];
    readonly files: readonly string[];
  };
  assert.equal(allowlist.candidate, "v0.1-rc.1");
  assert.deepEqual(allowlist.files, [...allowlist.files].sort());
  assert.equal(new Set(allowlist.files).size, allowlist.files.length);
  assert.deepEqual(allowlist.checksumExclusions, [
    "release/v0.1-rc.1/checksums.json",
  ]);
  for (const path of allowlist.files) {
    assert.match(path, /^[A-Za-z0-9._/-]+$/u);
    assert.equal(path.startsWith("/"), false);
    assert.equal(path.split("/").some((part) => part === "" || part === "." || part === ".."), false);
  }

  const checksums = JSON.parse(
    await readFile(join(candidateDirectory, "checksums.json"), "utf8"),
  ) as {
    readonly candidate: string;
    readonly algorithm: string;
    readonly purpose: string;
    readonly authentication: {
      readonly publicVcsCommit: string;
      readonly checksumManifestSha256: string;
    };
    readonly files: Readonly<Record<string, string>>;
  };
  assert.equal(checksums.candidate, "v0.1-rc.1");
  assert.equal(checksums.algorithm, "sha256");
  assert.equal(checksums.purpose, "drift-detection-only");
  assert.deepEqual(checksums.authentication, {
    publicVcsCommit: "pending",
    checksumManifestSha256: "pending",
  });
  assert.deepEqual(Object.keys(checksums.files), allowlist.files.filter(
    (path) => !allowlist.checksumExclusions.includes(path),
  ));
  assert.equal(Object.values(checksums.files).every(
    (digest) => /^[0-9a-f]{64}$/u.test(digest),
  ), true);
});

test("checksum exclusions contain only the checksum document", async (t) => {
  for (const checksumExclusions of [
    [] as string[],
    ["release/v0.1-rc.1/checksums.json", "dist/off.mjs"],
  ]) {
    await t.test(
      checksumExclusions.length === 0 ? "missing exclusion" : "extra exclusion",
      async (subtest) => {
        const root = await copyReleaseRoot(subtest);
        const path = join(root, "release/v0.1-rc.1/files.json");
        const allowlist = JSON.parse(await readFile(path, "utf8")) as {
          checksumExclusions: string[];
          [key: string]: unknown;
        };
        allowlist.checksumExclusions = checksumExclusions;
        await writeJson(path, allowlist);
        const validation = await runReleaseValidation(root);
        assert.equal(validation.exitCode, 1);
        assert.equal(
          diagnosticCodes(validation.result).includes(
            "OFF-REL-ALLOWLIST-EXCLUSION",
          ),
          true,
        );
      },
    );
  }
});

test("release validation rejects missing and unlisted runtime artifacts", async (t) => {
  await t.test("missing allowlisted file", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    await unlink(join(root, "clean-room/CONSUMER_TASK.md"));
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-MISSING"), true);
  });

  await t.test("unlisted runtime file", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    await writeFile(join(root, "dist/unlisted.mjs"), "export {};\n");
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-UNLISTED"), true);
  });
});

test("release validation rejects unsafe or symlinked allowlist paths", async (t) => {
  await t.test("unsafe path", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    const path = join(root, "release/v0.1-rc.1/files.json");
    const allowlist = JSON.parse(await readFile(path, "utf8")) as {
      files: string[];
      [key: string]: unknown;
    };
    allowlist.files.push("../escape");
    await writeJson(path, allowlist);
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-UNSAFE-PATH"), true);
  });

  await t.test("symlinked file", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    const target = join(root, "clean-room/CONSUMER_TASK.md");
    await unlink(target);
    await symlink("PRODUCER_TASK.md", target);
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-SYMLINK"), true);
  });
});

test("release validation rejects stale checksums and generated bundle drift", async (t) => {
  await t.test("stale checksum", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    await writeFile(join(root, "CHANGELOG.md"), "# changed\n");
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-CHECKSUM"), true);
  });

  await t.test("generated bundle drift", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    await writeFile(join(root, "dist/off.mjs"), "#!/usr/bin/env node\n");
    await updateDriftChecksum(root, "dist/off.mjs");
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(
      diagnosticCodes(validation.result).includes("OFF-REL-DIST-DRIFT"),
      true,
      validation.stdout,
    );
  });
});

test("external validation never executes candidate build code", async (t) => {
  const root = await copyReleaseRoot(t);
  assert.equal(releaseValidator.startsWith(root + "/"), false);
  const sentinel = join(root, "candidate-build-executed");
  await unlink(join(root, "node_modules"));
  await mkdir(join(root, "node_modules/ajv/dist"), { recursive: true });
  await writeFile(
    join(root, "node_modules/ajv/dist/2020.js"),
    "candidate-controlled dependency is not valid JavaScript {{{\n",
  );
  const candidateBuild = [
    'import { copyFile, writeFile } from "node:fs/promises";',
    'import { fileURLToPath } from "node:url";',
    'const outputIndex = process.argv.indexOf("--outfile");',
    'await writeFile(fileURLToPath(new URL("../candidate-build-executed", import.meta.url)), "executed\\n");',
    'await copyFile(fileURLToPath(new URL("../dist/off.mjs", import.meta.url)), process.argv[outputIndex + 1]);',
    "",
  ].join("\n");
  await writeFile(join(root, "scripts/build.mjs"), candidateBuild);
  await writeFile(join(root, "dist/off.mjs"), "#!/usr/bin/env node\n// drift\n");
  await updateDriftChecksum(root, "scripts/build.mjs");
  await updateDriftChecksum(root, "dist/off.mjs");

  const validation = await runReleaseValidation(root);
  assert.equal(validation.exitCode, 1);
  assert.equal(
    diagnosticCodes(validation.result).includes("OFF-REL-DIST-DRIFT"),
    true,
    validation.stdout,
  );
  assert.equal(
    diagnosticCodes(validation.result).includes("OFF-REL-DIST-BUILD"),
    false,
  );
  await assert.rejects(access(sentinel));
});

test("release builds reject every unallowlisted candidate input", async (t) => {
  const root = await copyReleaseRoot(t);
  await mkdir(join(root, "extras"), { recursive: true });
  await writeFile(
    join(root, "extras/unlisted.ts"),
    "candidate-controlled build input is not valid JavaScript {{{\n",
  );
  const entryPath = join(root, "src/cli.ts");
  const entry = await readFile(entryPath, "utf8");
  await writeFile(entryPath, 'import "../extras/unlisted.ts";\n' + entry);
  await updateDriftChecksum(root, "src/cli.ts");

  const validation = await runReleaseValidation(root);
  assert.equal(validation.exitCode, 1);
  assert.equal(
    diagnosticCodes(validation.result).includes("OFF-REL-DIST-BUILD"),
    true,
    validation.stdout,
  );
  assert.equal(
    diagnosticCodes(validation.result).includes("OFF-REL-UNLISTED"),
    false,
    validation.stdout,
  );
});

test("public release commands distinguish self-checking from trusted external validation", async () => {
  const packageDocument = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  ) as { readonly scripts?: Readonly<Record<string, string>> };
  const readme = await readFile(join(repositoryRoot, "README.md"), "utf8");
  const releaseReadme = await readFile(join(candidateDirectory, "README.md"), "utf8");

  assert.equal(
    packageDocument.scripts?.["release:self-check"],
    "node scripts/release-validate.mjs --root .",
  );
  assert.equal(packageDocument.scripts?.["release:validate"], undefined);
  for (const document of [readme, releaseReadme]) {
    assert.match(document, /self-check[^.]*not authentication/iu);
    assert.match(document, /separate verifier checkout/iu);
    assert.match(document, /outside the candidate root/iu);
    assert.match(
      document,
      /authenticated-off-verifier\/scripts\/release-validate\.mjs --root \/absolute\/path\/to\/untrusted-candidate/u,
    );
    assert.match(document, /not import candidate scripts or dependencies/iu);
  }
});

test("candidate-label drift and evidence-free v0.1 promotion are rejected", async (t) => {
  const root = await copyReleaseRoot(t);
  const allowlistPath = join(root, "release/v0.1-rc.1/files.json");
  const allowlist = JSON.parse(await readFile(allowlistPath, "utf8")) as {
    candidate: string;
    [key: string]: unknown;
  };
  allowlist.candidate = "v0.1";
  await writeJson(allowlistPath, allowlist);
  const validation = await runReleaseValidation(root);
  assert.equal(validation.exitCode, 1);
  assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-CANDIDATE"), true);
  assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-PROMOTION-EVIDENCE"), true);
});

test("syntactically plausible self-attestation cannot certify promotion", async (t) => {
  const root = await copyReleaseRoot(t);
  const allowlistPath = join(root, "release/v0.1-rc.1/files.json");
  const allowlist = JSON.parse(await readFile(allowlistPath, "utf8")) as {
    candidate: string;
    [key: string]: unknown;
  };
  allowlist.candidate = "v0.1";
  await writeJson(allowlistPath, allowlist);

  const reportPath = join(
    root,
    "clean-room/INTEROPERABILITY_REPORT.template.md",
  );
  const report = await readFile(reportPath, "utf8");
  const claimedRecord = {
    recordVersion: "0.1",
    candidate: "v0.1",
    authentication: {
      publicVcsCommit: "a".repeat(40),
      checksumManifestSha256: "b".repeat(64),
    },
    independence: {
      status: "passed",
      noPrivateGuidance: "passed",
      evidencePath: "evidence/independence.json",
    },
    gates: {
      independentConsumer: {
        status: "passed",
        implementationLanguage: "Rust",
        evidencePath: "evidence/consumer.json",
      },
      independentProducer: {
        status: "passed",
        packageId: "urn:off:independent:package",
        evidencePath: "evidence/producer.json",
      },
      tenMinuteCoreAuthoring: {
        status: "passed",
        durationSeconds: 480,
        evidencePath: "evidence/core-authoring.json",
      },
      adoption: {
        status: "passed",
        evidencePath: "evidence/adoption.json",
      },
    },
  };
  const begin = "<!-- OFF-INTEROPERABILITY-RECORD-BEGIN\n";
  const end = "\nOFF-INTEROPERABILITY-RECORD-END -->";
  const start = report.indexOf(begin);
  const finish = report.indexOf(end, start + begin.length);
  assert.notEqual(start, -1);
  assert.notEqual(finish, -1);
  await writeFile(
    reportPath,
    report.slice(0, start + begin.length) +
      JSON.stringify(claimedRecord, null, 2) +
      report.slice(finish),
  );
  await updateDriftChecksum(
    root,
    "release/v0.1-rc.1/files.json",
  );
  await updateDriftChecksum(
    root,
    "clean-room/INTEROPERABILITY_REPORT.template.md",
  );

  const validation = await runReleaseValidation(root);
  assert.equal(validation.exitCode, 1);
  assert.equal(
    diagnosticCodes(validation.result).includes("OFF-REL-PROMOTION-EVIDENCE"),
    true,
    validation.stdout,
  );
});

test("rc.1 rejects premature passed evidence and case-ambiguous paths", async (t) => {
  await t.test("premature passed evidence", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    const path = join(root, "clean-room/INTEROPERABILITY_REPORT.template.md");
    const report = await readFile(path, "utf8");
    await writeFile(
      path,
      report.replace(
        '"independentConsumer": {\n      "status": "pending"',
        '"independentConsumer": {\n      "status": "passed"',
      ),
    );
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-RC1-EVIDENCE"), true);
  });

  await t.test("mutation outside the projected gate summary", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    const path = join(root, "clean-room/INTEROPERABILITY_REPORT.template.md");
    const report = await readFile(path, "utf8");
    await writeFile(
      path,
      report.replace('"claimBasis": "pending"', '"claimBasis": "author-claimed"'),
    );
    await updateDriftChecksum(
      root,
      "clean-room/INTEROPERABILITY_REPORT.template.md",
    );
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(
      diagnosticCodes(validation.result).includes("OFF-REL-RC1-EVIDENCE"),
      true,
      validation.stdout,
    );
    assert.equal(
      diagnosticCodes(validation.result).includes("OFF-REL-CHECKSUM"),
      false,
      validation.stdout,
    );
  });

  await t.test("duplicate evidence names cannot collapse to pending", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    const path = join(root, "clean-room/INTEROPERABILITY_REPORT.template.md");
    const report = await readFile(path, "utf8");
    await writeFile(
      path,
      report.replace(
        '"status": "pending",\n      "implementationLanguage": "pending"',
        '"status": "passed",\n      "status": "pending",\n      "implementationLanguage": "pending"',
      ),
    );
    await updateDriftChecksum(
      root,
      "clean-room/INTEROPERABILITY_REPORT.template.md",
    );
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(
      diagnosticCodes(validation.result).includes("OFF-REL-RC1-EVIDENCE"),
      true,
      validation.stdout,
    );
    assert.equal(
      diagnosticCodes(validation.result).includes("OFF-REL-CHECKSUM"),
      false,
      validation.stdout,
    );
  });

  await t.test("closed record shape rejects an undeclared field", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    const path = join(root, "clean-room/INTEROPERABILITY_REPORT.template.md");
    const report = await readFile(path, "utf8");
    await writeFile(
      path,
      report.replace(
        '"recordVersion": "0.1",',
        '"recordVersion": "0.1",\n  "undeclaredEvidence": "pending",',
      ),
    );
    await updateDriftChecksum(
      root,
      "clean-room/INTEROPERABILITY_REPORT.template.md",
    );
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(
      diagnosticCodes(validation.result).includes("OFF-REL-EVIDENCE-RECORD"),
      true,
      validation.stdout,
    );
  });

  await t.test("case-ambiguous allowlist", async (subtest) => {
    const root = await copyReleaseRoot(subtest);
    const path = join(root, "release/v0.1-rc.1/files.json");
    const allowlist = JSON.parse(await readFile(path, "utf8")) as {
      files: string[];
      [key: string]: unknown;
    };
    allowlist.files.push("readme.md");
    allowlist.files.sort();
    await writeJson(path, allowlist);
    const validation = await runReleaseValidation(root);
    assert.equal(validation.exitCode, 1);
    assert.equal(diagnosticCodes(validation.result).includes("OFF-REL-ALLOWLIST-CASE"), true);
  });
});

test("clean-room tasks isolate consumption, production, and ambiguity handling", async () => {
  const consumer = await readFile(join(repositoryRoot, "clean-room/CONSUMER_TASK.md"), "utf8");
  const producer = await readFile(join(repositoryRoot, "clean-room/PRODUCER_TASK.md"), "utf8");
  const report = await readFile(
    join(repositoryRoot, "clean-room/INTEROPERABILITY_REPORT.template.md"),
    "utf8",
  );
  const releaseReadme = await readFile(join(candidateDirectory, "README.md"), "utf8");

  assert.match(consumer, /another programming language/iu);
  assert.match(consumer, /canonical normalized bytes/iu);
  assert.match(consumer, /diagnostics/iu);
  assert.match(consumer, /freshness/iu);
  assert.match(consumer, /lineage/iu);
  assert.match(consumer, /public materials only/iu);

  assert.match(producer, /distinct[^.\n]*Traceable Public Equity/iu);
  assert.match(producer, /reference validator/iu);
  assert.match(producer, /public materials only/iu);
  assert.match(producer, /ten minutes/iu);
  assert.match(producer, /Do not inspect `src\/`/u);
  assert.match(producer, /reverse-engineering `dist\/off\.mjs`/u);
  assert.match(producer, /freeze timestamp/iu);
  assert.match(producer, /first reference-validator result/iu);

  assert.match(report, /"independence":\s*\{/u);
  assert.match(report, /"independentConsumer":\s*\{\s*"status":\s*"pending"/u);
  assert.match(report, /"independentProducer":\s*\{\s*"status":\s*"pending"/u);
  assert.match(report, /"tenMinuteCoreAuthoring":\s*\{\s*"status":\s*"pending"/u);
  assert.match(report, /private clarification[^.\n]*new immutable release candidate/iu);
  assert.match(report, /author-claimed/iu);
  assert.match(report, /automated validator cannot promote/iu);

  assert.match(releaseReadme, /drift detection/iu);
  assert.match(releaseReadme, /not publisher authentication/iu);
  assert.match(releaseReadme, /public VCS commit/iu);
  assert.match(releaseReadme, /checksum-manifest digest/iu);
});
