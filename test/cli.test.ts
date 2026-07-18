import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { runCli } from "../src/cli.ts";
import {
  compareEvaluatorFailureRuns,
  MAX_CORPUS_BYTES,
  MAX_EVALUATOR_VECTOR_BYTES,
  MAX_EXPECTATION_BYTES,
  verifyCorpus,
} from "../src/corpus.ts";
import {
  evaluatePackage,
  MAX_MANIFEST_BYTES,
  MAX_PACKAGE_ROOT_ENTRIES,
  PUBLIC_EQUITY_PROFILE_URI,
} from "../src/index.ts";
import { canonicalizeJsonText } from "../src/json/jcs.ts";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const conformanceRoot = join(repositoryRoot, "conformance");
const evaluatedAt = "2026-07-17T12:00:00Z";

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function captureIo(): {
  readonly io: { stdout(value: string): void; stderr(value: string): void };
  readonly stdout: () => string;
  readonly stderr: () => string;
} {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout(value) {
        stdout += value;
      },
      stderr(value) {
        stderr += value;
      },
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function evaluatorFailureVector(
  expected: unknown = {
    kind: "evaluatorFailure",
    code: "OFF-T1004",
    operation: "configuration",
  },
) {
  return {
    vectorVersion: "0.1",
    cases: [{
      id: "configuration/fractional-evaluated-at",
      boundary: "A fractional evaluation timestamp fails before package I/O.",
      package: "configuration-io-sentinel-must-not-exist",
      evaluatedAt: "2026-07-17T12:00:00.001Z",
      requestedProfiles: [],
      expected,
    }],
  };
}

async function writeCorpusFixture(
  root: string,
  document: Readonly<Record<string, unknown>>,
): Promise<string> {
  await writeFile(
    join(root, "evaluator-failures.json"),
    JSON.stringify(evaluatorFailureVector()),
  );
  const corpusPath = join(root, "corpus.json");
  await writeFile(corpusPath, JSON.stringify({
    ...document,
    evaluatorFailures: "evaluator-failures.json",
  }));
  return corpusPath;
}

async function baselinePackageCase(root: string) {
  const packageRoot = join(root, "baseline-package");
  await mkdir(packageRoot, { recursive: true });
  const evaluated = await evaluatePackage({
    packageRoot,
    evaluatedAt,
    requestedProfiles: [],
  });
  assert.equal(evaluated.kind, "packageResult");
  if (evaluated.kind !== "packageResult") {
    throw new Error("baseline package unexpectedly failed evaluation");
  }
  await writeFile(
    join(root, "baseline-expected.json"),
    `${text(evaluated.canonicalBytes)}\n`,
  );
  return {
    id: "baseline/missing-manifest",
    boundary: "A baseline package keeps vector-focused corpora non-empty.",
    package: "baseline-package",
    evaluatedAt,
    requestedProfiles: [],
    expectedOutcome: "invalid",
    expectedDiagnosticCodes: ["OFF-E1006"],
    expected: "baseline-expected.json",
  };
}

test("the public primitive returns canonical bytes for Core and requested Public Equity", async () => {
  const core = await evaluatePackage({
    packageRoot: join(conformanceRoot, "packages/core-minimal"),
    evaluatedAt,
    requestedProfiles: [],
  });
  assert.equal(core.kind, "packageResult");
  if (core.kind !== "packageResult") return;
  assert.equal(core.normalized.outcome, "valid");
  assert.equal(text(core.canonicalBytes), canonicalizeJsonText(core.normalized));
  assert.equal(text(core.canonicalBytes).endsWith("\n"), false);

  const profile = await evaluatePackage({
    packageRoot: join(conformanceRoot, "packages/public-equity-traceable"),
    evaluatedAt: "2026-07-17T23:59:59Z",
    requestedProfiles: [PUBLIC_EQUITY_PROFILE_URI],
  });
  assert.equal(profile.kind, "packageResult");
  if (profile.kind !== "packageResult") return;
  assert.equal(profile.normalized.outcome, "validWithWarnings");
  assert.equal(
    profile.normalized.profileResults.declared[0]?.status,
    "passed",
  );
  assert.equal(text(profile.canonicalBytes), canonicalizeJsonText(profile.normalized));
});

test("a readable package root without off.json is package-invalid with only OFF-E1006", async (t) => {
  const packageRoot = await mkdtemp(join(tmpdir(), "off-missing-manifest-"));
  t.after(async () => rm(packageRoot, { recursive: true, force: true }));

  const result = await evaluatePackage({
    packageRoot,
    evaluatedAt,
    requestedProfiles: [],
  });
  assert.equal(result.kind, "packageResult");
  if (result.kind !== "packageResult") return;
  assert.equal(result.normalized.outcome, "invalid");
  assert.deepEqual(result.normalized.diagnostics, [
    {
      code: "OFF-E1006",
      severity: "error",
      instanceLocation: "",
      ruleId: "OFF.MANIFEST.MISSING",
      parameters: {},
    },
  ]);
  assert.equal("entityId" in result.normalized.diagnostics[0]!, false);
  assert.equal(text(result.canonicalBytes).includes(packageRoot), false);
});

test("a host failure stays an evaluatorFailure without a package verdict", async () => {
  const packageRoot = join(tmpdir(), "off-root-that-does-not-exist-u6");
  const result = await evaluatePackage({
    packageRoot,
    evaluatedAt,
    requestedProfiles: [],
  });
  assert.deepEqual(result, {
    kind: "evaluatorFailure",
    code: "OFF-T1002",
    operation: "rootAccess",
  });
  assert.equal("normalized" in result, false);
  assert.equal("canonicalBytes" in result, false);
  assert.equal(JSON.stringify(result).includes(packageRoot), false);
});

test("invalid public evaluation context is a sanitized evaluator configuration failure", async () => {
  const result = await evaluatePackage({
    packageRoot: join(conformanceRoot, "packages/core-minimal"),
    evaluatedAt: "2026-07-17T12:00:00.000Z",
    requestedProfiles: [],
  });
  assert.deepEqual(result, {
    kind: "evaluatorFailure",
    code: "OFF-T1004",
    operation: "configuration",
  });
});

test("the public evaluator-failure vector matches the evaluation primitive", async () => {
  const vector = JSON.parse(
    await readFile(join(conformanceRoot, "evaluator-failures.json"), "utf8"),
  ) as {
    readonly vectorVersion: string;
    readonly cases: readonly {
      readonly package: string;
      readonly evaluatedAt: string;
      readonly requestedProfiles: readonly string[];
      readonly expected: unknown;
    }[];
  };
  assert.equal(vector.vectorVersion, "0.1");
  assert.equal(vector.cases.length, 1);
  for (const item of vector.cases) {
    assert.equal(item.package, "configuration-io-sentinel-must-not-exist");
    await assert.rejects(
      readFile(join(conformanceRoot, item.package)),
      (error: unknown) =>
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT",
    );
    const result = await evaluatePackage({
      packageRoot: join(conformanceRoot, item.package),
      evaluatedAt: item.evaluatedAt,
      requestedProfiles: item.requestedProfiles,
    });
    assert.deepEqual(result, item.expected);
    assert.equal("normalized" in result, false);
    assert.equal("canonicalBytes" in result, false);
  }
});

test("manifest and package-root inventory ceilings are deterministic evaluator limits", async (t) => {
  assert.equal(MAX_MANIFEST_BYTES, 16 * 1024 * 1024);
  assert.equal(MAX_PACKAGE_ROOT_ENTRIES, 100_000);
  const packageRoot = await mkdtemp(join(tmpdir(), "off-large-manifest-"));
  t.after(async () => rm(packageRoot, { recursive: true, force: true }));
  await writeFile(join(packageRoot, "off.json"), "");
  await truncate(join(packageRoot, "off.json"), MAX_MANIFEST_BYTES + 1);
  const result = await evaluatePackage({
    packageRoot,
    evaluatedAt,
    requestedProfiles: [],
  });
  assert.deepEqual(result, {
    kind: "evaluatorFailure",
    code: "OFF-T1001",
    operation: "resourceLimit",
  });
  assert.equal(JSON.stringify(result).includes(packageRoot), false);
});

test("validate and normalize are projections of the same package primitive", async () => {
  const packageRoot = join(conformanceRoot, "packages/core-minimal");
  const validateCapture = captureIo();
  const normalizeCapture = captureIo();
  assert.equal(
    await runCli(
      ["validate", packageRoot, "--evaluated-at", evaluatedAt],
      validateCapture.io,
    ),
    0,
  );
  assert.equal(
    await runCli(
      ["normalize", packageRoot, "--evaluated-at", evaluatedAt],
      normalizeCapture.io,
    ),
    0,
  );
  assert.equal(validateCapture.stdout(), normalizeCapture.stdout());
  assert.equal(validateCapture.stderr(), "");
  assert.equal(normalizeCapture.stderr(), "");
  assert.equal(validateCapture.stdout().endsWith("\n"), true);
});

test("the CLI uses exit 1 for invalid packages, 2 for evaluator failure, and 64 for usage", async (t) => {
  const missingRoot = await mkdtemp(join(tmpdir(), "off-cli-missing-"));
  t.after(async () => rm(missingRoot, { recursive: true, force: true }));

  const invalidCapture = captureIo();
  assert.equal(
    await runCli(
      ["validate", missingRoot, "--evaluated-at", evaluatedAt],
      invalidCapture.io,
    ),
    1,
  );
  assert.match(invalidCapture.stdout(), /"code":"OFF-E1006"/u);
  assert.equal(invalidCapture.stderr(), "");

  const failureCapture = captureIo();
  assert.equal(
    await runCli(
      [
        "normalize",
        join(tmpdir(), "off-cli-root-that-does-not-exist-u6"),
        "--evaluated-at",
        evaluatedAt,
      ],
      failureCapture.io,
    ),
    2,
  );
  assert.equal(failureCapture.stdout(), "");
  assert.equal(failureCapture.stderr(), '{"code":"OFF-T1002","kind":"evaluatorFailure","operation":"rootAccess"}\n');

  const usageCapture = captureIo();
  assert.equal(await runCli(["normalize", missingRoot], usageCapture.io), 64);
  assert.equal(usageCapture.stdout(), "");
  assert.match(usageCapture.stderr(), /^Usage:/u);
});

test("corpus verify matches package expectations and evaluator failures twice", async () => {
  const descriptor = JSON.parse(
    await readFile(join(conformanceRoot, "corpus.json"), "utf8"),
  ) as {
    readonly cases: readonly {
      readonly id: string;
      readonly expectedOutcome: string;
    }[];
  };
  const vector = JSON.parse(
    await readFile(join(conformanceRoot, "evaluator-failures.json"), "utf8"),
  ) as {
    readonly cases: readonly {
      readonly id: string;
      readonly expected: unknown;
    }[];
  };
  const result = await verifyCorpus(join(conformanceRoot, "corpus.json"));
  assert.equal(result.kind, "corpusResult");
  if (result.kind !== "corpusResult") return;
  assert.deepEqual(Object.keys(result).sort(), [
    "cases",
    "corpusVersion",
    "evaluatorFailureCases",
    "kind",
    "ok",
  ]);
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.cases,
    descriptor.cases.map((item) => ({
      id: item.id,
      status: "passed",
      outcome: item.expectedOutcome,
    })),
  );
  assert.deepEqual(
    result.evaluatorFailureCases,
    vector.cases.map((item) => ({
      id: item.id,
      status: "passed",
      evaluatorFailure: item.expected,
    })),
  );
  assert.deepEqual(
    await verifyCorpus(join(conformanceRoot, "corpus.json")),
    result,
  );

  const capture = captureIo();
  assert.equal(
    await runCli(
      ["corpus", "verify", "--corpus", join(conformanceRoot, "corpus.json")],
      capture.io,
    ),
    0,
  );
  const output = JSON.parse(capture.stdout());
  assert.deepEqual(output, result);
  assert.equal(capture.stderr(), "");
});

test("the corpus descriptor must bind one closed evaluator-failure vector", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-vector-shape-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const baseline = await baselinePackageCase(root);

  await writeFile(join(root, "missing-vector.json"), JSON.stringify({
    corpusVersion: "0.1",
    cases: [baseline],
  }));
  assert.deepEqual(await verifyCorpus(join(root, "missing-vector.json")), {
    kind: "corpusResult",
    ok: false,
    corpusVersion: "0.1",
    cases: [{ id: "corpus", status: "mismatch", reason: "invalidCorpus" }],
    evaluatorFailureCases: [],
  });

  await writeFile(
    join(root, "valid-vector.json"),
    JSON.stringify(evaluatorFailureVector()),
  );
  await writeFile(join(root, "empty-corpus.json"), JSON.stringify({
    corpusVersion: "0.1",
    evaluatorFailures: "valid-vector.json",
    cases: [],
  }));
  assert.deepEqual(await verifyCorpus(join(root, "empty-corpus.json")), {
    kind: "corpusResult",
    ok: false,
    corpusVersion: "0.1",
    cases: [{ id: "corpus", status: "mismatch", reason: "invalidCorpus" }],
    evaluatorFailureCases: [],
  });

  await writeFile(
    join(root, "malformed-vector.json"),
    JSON.stringify(evaluatorFailureVector({
      kind: "evaluatorFailure",
      code: "OFF-T1004",
      operation: "configuration",
      unexpected: true,
    })),
  );
  await writeFile(join(root, "malformed-corpus.json"), JSON.stringify({
    corpusVersion: "0.1",
    evaluatorFailures: "malformed-vector.json",
    cases: [baseline],
  }));
  assert.deepEqual(await verifyCorpus(join(root, "malformed-corpus.json")), {
    kind: "corpusResult",
    ok: false,
    corpusVersion: "0.1",
    cases: [],
    evaluatorFailureCases: [{
      id: "evaluator-failures",
      status: "mismatch",
      reason: "invalidEvaluatorVector",
    }],
  });
});

test("evaluator-failure vector references cannot escape or traverse symlinks", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-vector-path-"));
  const outside = await mkdtemp(join(tmpdir(), "off-vector-outside-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });
  const baseline = await baselinePackageCase(root);
  await writeFile(join(outside, "vector.json"), JSON.stringify(evaluatorFailureVector()));

  await writeFile(join(root, "escape-corpus.json"), JSON.stringify({
    corpusVersion: "0.1",
    evaluatorFailures: "../vector.json",
    cases: [baseline],
  }));
  const escaped = await verifyCorpus(join(root, "escape-corpus.json"));
  assert.equal(escaped.kind, "corpusResult");
  if (escaped.kind === "corpusResult") {
    assert.deepEqual(escaped.evaluatorFailureCases, [{
      id: "evaluator-failures",
      status: "mismatch",
      reason: "pathEscape",
    }]);
  }

  await symlink(join(outside, "vector.json"), join(root, "linked-vector.json"));
  await writeFile(join(root, "symlink-corpus.json"), JSON.stringify({
    corpusVersion: "0.1",
    evaluatorFailures: "linked-vector.json",
    cases: [baseline],
  }));
  const linked = await verifyCorpus(join(root, "symlink-corpus.json"));
  assert.equal(linked.kind, "corpusResult");
  if (linked.kind === "corpusResult") {
    assert.deepEqual(linked.evaluatorFailureCases, [{
      id: "evaluator-failures",
      status: "mismatch",
      reason: "pathEscape",
    }]);
  }
});

test("I/O-capable evaluator vectors enforce package path and symlink defenses", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-vector-package-path-"));
  const outside = await mkdtemp(join(tmpdir(), "off-vector-package-outside-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });
  const baseline = await baselinePackageCase(root);
  const expectedRootAccess = {
    kind: "evaluatorFailure",
    code: "OFF-T1002",
    operation: "rootAccess",
  };

  const escapedVector = evaluatorFailureVector(expectedRootAccess);
  escapedVector.cases[0]!.package = "../outside-package";
  escapedVector.cases[0]!.evaluatedAt = evaluatedAt;
  await writeFile(
    join(root, "escaped-package-vector.json"),
    JSON.stringify(escapedVector),
  );
  await writeFile(join(root, "escaped-package-corpus.json"), JSON.stringify({
    corpusVersion: "0.1",
    evaluatorFailures: "escaped-package-vector.json",
    cases: [baseline],
  }));
  const escaped = await verifyCorpus(join(root, "escaped-package-corpus.json"));
  assert.equal(escaped.kind, "corpusResult");
  if (escaped.kind === "corpusResult") {
    assert.deepEqual(escaped.evaluatorFailureCases, [{
      id: "configuration/fractional-evaluated-at",
      status: "mismatch",
      reason: "pathEscape",
    }]);
  }

  await symlink(outside, join(root, "linked-package"));
  const linkedVector = evaluatorFailureVector(expectedRootAccess);
  linkedVector.cases[0]!.package = "linked-package";
  linkedVector.cases[0]!.evaluatedAt = evaluatedAt;
  await writeFile(
    join(root, "linked-package-vector.json"),
    JSON.stringify(linkedVector),
  );
  await writeFile(join(root, "linked-package-corpus.json"), JSON.stringify({
    corpusVersion: "0.1",
    evaluatorFailures: "linked-package-vector.json",
    cases: [baseline],
  }));
  const linked = await verifyCorpus(join(root, "linked-package-corpus.json"));
  assert.equal(linked.kind, "corpusResult");
  if (linked.kind === "corpusResult") {
    assert.deepEqual(linked.evaluatorFailureCases, [{
      id: "configuration/fractional-evaluated-at",
      status: "mismatch",
      reason: "pathEscape",
    }]);
  }
});

test("tampered and nondeterministic evaluator failures remain separate mismatches", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-vector-tamper-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const baseline = await baselinePackageCase(root);
  await writeFile(
    join(root, "evaluator-failures.json"),
    JSON.stringify(evaluatorFailureVector({
      kind: "evaluatorFailure",
      code: "OFF-T1004",
      operation: "internal",
    })),
  );
  await writeFile(join(root, "corpus.json"), JSON.stringify({
    corpusVersion: "0.1",
    evaluatorFailures: "evaluator-failures.json",
    cases: [baseline],
  }));
  const tampered = await verifyCorpus(join(root, "corpus.json"));
  assert.equal(tampered.kind, "corpusResult");
  if (tampered.kind === "corpusResult") {
    assert.deepEqual(tampered.evaluatorFailureCases, [{
      id: "configuration/fractional-evaluated-at",
      status: "mismatch",
      reason: "evaluatorFailureMismatch",
    }]);
  }

  const expected = {
    kind: "evaluatorFailure" as const,
    code: "OFF-T1004" as const,
    operation: "configuration" as const,
  };
  assert.deepEqual(
    compareEvaluatorFailureRuns(
      "configuration/repeated",
      expected,
      expected,
      { ...expected, operation: "internal" },
    ),
    {
      id: "configuration/repeated",
      status: "mismatch",
      reason: "nondeterministic",
    },
  );
  const ioFirst = {
    kind: "evaluatorFailure" as const,
    code: "OFF-T1002" as const,
    operation: "rootAccess" as const,
  };
  assert.deepEqual(
    compareEvaluatorFailureRuns(
      "configuration/io-first",
      expected,
      ioFirst,
      ioFirst,
    ),
    {
      id: "configuration/io-first",
      status: "mismatch",
      reason: "evaluatorFailureMismatch",
    },
  );
});

test("corpus entries cannot escape the corpus tree", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-corpus-escape-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const corpusPath = await writeCorpusFixture(root, {
    corpusVersion: "0.1",
    cases: [{
      id: "escape/invalid",
      boundary: "An expectation path cannot leave the corpus tree.",
      package: "../outside",
      evaluatedAt,
      requestedProfiles: [],
      expectedOutcome: "invalid",
      expectedDiagnosticCodes: ["OFF-E1006"],
      expected: "../expected.json",
    }],
  });
  const result = await verifyCorpus(corpusPath);
  assert.equal(result.kind, "corpusResult");
  if (result.kind !== "corpusResult") return;
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, [
    { id: "escape/invalid", status: "mismatch", reason: "pathEscape" },
  ]);
});

test("corpus package and expectation symlinks are rejected even without lexical escape", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-corpus-symlink-"));
  const outside = await mkdtemp(join(tmpdir(), "off-corpus-outside-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });
  await mkdir(join(root, "local-package"));
  await writeFile(join(outside, "expected.json"), "{}\n");
  await symlink(outside, join(root, "linked-package"));
  await symlink(
    join(outside, "expected.json"),
    join(root, "linked-expected.json"),
  );
  await writeFile(join(root, "local-expected.json"), "{}\n");
  const corpusPath = await writeCorpusFixture(root, {
    corpusVersion: "0.1",
    cases: [
      {
        id: "symlink/package",
        boundary: "A package symlink cannot redirect corpus evaluation.",
        package: "linked-package",
        evaluatedAt,
        requestedProfiles: [],
        expectedOutcome: "invalid",
        expectedDiagnosticCodes: ["OFF-E1006"],
        expected: "local-expected.json",
      },
      {
        id: "symlink/expectation",
        boundary: "An expectation symlink cannot redirect comparison.",
        package: "local-package",
        evaluatedAt,
        requestedProfiles: [],
        expectedOutcome: "invalid",
        expectedDiagnosticCodes: ["OFF-E1006"],
        expected: "linked-expected.json",
      },
    ],
  });

  const result = await verifyCorpus(corpusPath);
  assert.equal(result.kind, "corpusResult");
  if (result.kind !== "corpusResult") return;
  assert.deepEqual(result.cases, [
    { id: "symlink/package", status: "mismatch", reason: "pathEscape" },
    { id: "symlink/expectation", status: "mismatch", reason: "pathEscape" },
  ]);
});

test("corpus host I/O failures are evaluator failures, not conformance mismatches", async (t) => {
  if (process.platform === "win32") {
    t.skip("POSIX permission probe");
    return;
  }
  const root = await mkdtemp(join(tmpdir(), "off-corpus-host-io-"));
  const packageRoot = join(root, "unreadable-package");
  t.after(async () => rm(root, { recursive: true, force: true }));
  await mkdir(packageRoot);
  await writeFile(join(root, "expected.json"), "{}\n");
  const corpusPath = await writeCorpusFixture(root, {
    corpusVersion: "0.1",
    cases: [{
      id: "host-io/unreadable-package",
      boundary: "Host permission failures do not become corpus mismatches.",
      package: "unreadable-package",
      evaluatedAt,
      requestedProfiles: [],
      expectedOutcome: "invalid",
      expectedDiagnosticCodes: ["OFF-E1006"],
      expected: "expected.json",
    }],
  });

  await chmod(packageRoot, 0o000);
  let result;
  try {
    result = await verifyCorpus(corpusPath);
  } finally {
    await chmod(packageRoot, 0o700);
  }
  assert.equal(result.kind, "evaluatorFailure");
  if (result.kind !== "evaluatorFailure") return;
  assert.equal(result.code, "OFF-T1002");
  assert.match(result.operation, /^(?:resourceStat|rootAccess)$/u);
  assert.equal(JSON.stringify(result).includes(root), false);
});

test("a statically missing corpus reference remains a descriptor mismatch", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-corpus-missing-reference-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "expected.json"), "{}\n");
  const corpusPath = await writeCorpusFixture(root, {
    corpusVersion: "0.1",
    cases: [{
      id: "descriptor/missing-package",
      boundary: "A missing declared package is a corpus descriptor mismatch.",
      package: "missing-package",
      evaluatedAt,
      requestedProfiles: [],
      expectedOutcome: "invalid",
      expectedDiagnosticCodes: ["OFF-E1006"],
      expected: "expected.json",
    }],
  });

  assert.deepEqual(await verifyCorpus(corpusPath), {
    kind: "corpusResult",
    ok: false,
    corpusVersion: "0.1",
    cases: [{
      id: "descriptor/missing-package",
      status: "mismatch",
      reason: "pathType",
    }],
    evaluatorFailureCases: [{
      id: "configuration/fractional-evaluated-at",
      status: "passed",
      evaluatorFailure: {
        kind: "evaluatorFailure",
        code: "OFF-T1004",
        operation: "configuration",
      },
    }],
  });
});

test("expectation documents require a canonical payload followed by exactly one LF", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "off-expectation-envelope-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "package"));
  const evaluated = await evaluatePackage({
    packageRoot: join(root, "package"),
    evaluatedAt,
    requestedProfiles: [],
  });
  assert.equal(evaluated.kind, "packageResult");
  if (evaluated.kind !== "packageResult") return;
  await writeFile(join(root, "expected.json"), evaluated.canonicalBytes);
  const corpusPath = await writeCorpusFixture(root, {
    corpusVersion: "0.1",
    cases: [{
      id: "expectation/missing-envelope-lf",
      boundary: "Repository expectation documents carry exactly one envelope LF.",
      package: "package",
      evaluatedAt,
      requestedProfiles: [],
      expectedOutcome: "invalid",
      expectedDiagnosticCodes: ["OFF-E1006"],
      expected: "expected.json",
    }],
  });
  const result = await verifyCorpus(corpusPath);
  assert.equal(result.kind, "corpusResult");
  if (result.kind !== "corpusResult") return;
  assert.deepEqual(result.cases, [{
    id: "expectation/missing-envelope-lf",
    status: "mismatch",
    reason: "expectationFormat",
  }]);
});

test("corpus and expectation reads enforce deterministic byte ceilings", async (t) => {
  assert.equal(MAX_CORPUS_BYTES, 1024 * 1024);
  assert.equal(MAX_EVALUATOR_VECTOR_BYTES, 1024 * 1024);
  assert.equal(MAX_EXPECTATION_BYTES, 16 * 1024 * 1024);
  const root = await mkdtemp(join(tmpdir(), "off-corpus-limits-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const baseline = await baselinePackageCase(root);

  const oversizedCorpus = join(root, "oversized-corpus.json");
  await writeFile(oversizedCorpus, "");
  await truncate(oversizedCorpus, MAX_CORPUS_BYTES + 1);
  assert.deepEqual(await verifyCorpus(oversizedCorpus), {
    kind: "evaluatorFailure",
    code: "OFF-T1001",
    operation: "resourceLimit",
  });

  const oversizedVector = join(root, "oversized-vector.json");
  await writeFile(oversizedVector, "");
  await truncate(oversizedVector, MAX_EVALUATOR_VECTOR_BYTES + 1);
  const vectorCorpus = join(root, "vector-corpus.json");
  await writeFile(vectorCorpus, JSON.stringify({
    corpusVersion: "0.1",
    evaluatorFailures: "oversized-vector.json",
    cases: [baseline],
  }));
  assert.deepEqual(await verifyCorpus(vectorCorpus), {
    kind: "evaluatorFailure",
    code: "OFF-T1001",
    operation: "resourceLimit",
  });

  await mkdir(join(root, "package"));
  const oversizedExpectation = join(root, "oversized-expected.json");
  await writeFile(oversizedExpectation, "");
  await truncate(oversizedExpectation, MAX_EXPECTATION_BYTES + 1);
  const corpusPath = await writeCorpusFixture(root, {
    corpusVersion: "0.1",
    cases: [{
      id: "expectation/oversized",
      boundary: "Expectation input is bounded before allocation.",
      package: "package",
      evaluatedAt,
      requestedProfiles: [],
      expectedOutcome: "invalid",
      expectedDiagnosticCodes: ["OFF-E1006"],
      expected: "oversized-expected.json",
    }],
  });
  assert.deepEqual(await verifyCorpus(corpusPath), {
    kind: "evaluatorFailure",
    code: "OFF-T1001",
    operation: "resourceLimit",
  });
});

test("repository expectations wrap one canonical payload with one LF", async () => {
  const corpus = JSON.parse(
    await readFile(join(conformanceRoot, "corpus.json"), "utf8"),
  ) as { cases: readonly { expected: string }[] };
  for (const item of corpus.cases) {
    const value = await readFile(join(conformanceRoot, item.expected), "utf8");
    assert.equal(value, `${canonicalizeJsonText(JSON.parse(value))}\n`);
  }
});
