import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  lstat,
  mkdtemp,
  open,
  opendir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { buildDistribution } from "./build.mjs";
import {
  ALLOWLIST_PATH,
  CHECKSUMS_PATH,
  EXPECTED_CANDIDATE,
  RELEASE_LIMITS,
  ReleaseManifestError,
  compareText,
  inspectReleaseFile,
  isSafeReleasePath,
  parseAllowlist,
  readReleaseFile,
  sha256ReleaseFile,
} from "./checksums.mjs";

const defaultRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedPackageVersion = "0.1.0-rc.1";
const reportPath = "clean-room/INTEROPERABILITY_REPORT.template.md";
const closedRoots = [
  "clean-room",
  "conformance",
  "dist",
  "release/v0.1-rc.1",
  "schemas",
  "scripts",
  "spec",
  "src",
];
const requiredTopLevel = [
  ".gitattributes",
  ".node-version",
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "package.json",
  "pnpm-lock.yaml",
  "tsconfig.json",
];
const pendingEvidence = {
  publicVcsCommit: "pending",
  checksumManifestDigest: "pending",
  independentConsumer: "pending",
  independentProducer: "pending",
  tenMinuteCoreAuthoring: "pending",
  adoption: "pending",
};
const pendingInteroperabilityRecord = {
  recordVersion: "0.1",
  candidate: "v0.1-rc.1",
  authentication: {
    publicVcsCommit: "pending",
    checksumManifestSha256: "pending",
    claimBasis: "pending",
    publicHumanReview: "pending",
    reviewer: "pending",
    reviewEvidencePath: "pending",
  },
  independence: {
    status: "pending",
    unaffiliatedImplementer: "pending",
    relationshipDisclosure: "pending",
    publicMaterialsOnly: "pending",
    noPrivateGuidance: "pending",
    sourceCodeNotInspected: "pending",
    distributionNotReverseEngineered: "pending",
    claimBasis: "pending",
    publicHumanReview: "pending",
    reviewer: "pending",
    evidencePath: "pending",
  },
  gates: {
    independentConsumer: {
      status: "pending",
      implementationLanguage: "pending",
      evaluatorFailureVectorsReproduced: "pending",
      evidencePath: "pending",
      claimBasis: "pending",
      publicHumanReview: "pending",
      reviewer: "pending",
      reviewEvidencePath: "pending",
    },
    independentProducer: {
      status: "pending",
      packageId: "pending",
      packageBytesFrozenBeforeValidation: "pending",
      firstCurrentValidatorResult: "pending",
      firstStaleValidatorResult: "pending",
      postValidationRepairs: "pending",
      evidencePath: "pending",
      claimBasis: "pending",
      publicHumanReview: "pending",
      reviewer: "pending",
      reviewEvidencePath: "pending",
    },
    tenMinuteCoreAuthoring: {
      status: "pending",
      durationSeconds: "pending",
      evidencePath: "pending",
      claimBasis: "pending",
      publicHumanReview: "pending",
      reviewer: "pending",
      reviewEvidencePath: "pending",
    },
    adoption: {
      status: "pending",
      evidencePath: "pending",
      claimBasis: "pending",
      publicHumanReview: "pending",
      reviewer: "pending",
      reviewEvidencePath: "pending",
    },
  },
};

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isPlainObject(value) &&
    JSON.stringify(Object.keys(value).sort(compareText)) ===
      JSON.stringify([...keys].sort(compareText));
}

function diagnosticCollector() {
  const diagnostics = [];
  const seen = new Set();
  return {
    add(code, path) {
      const safePath = path === "." ||
          (typeof path === "string" && isSafeReleasePath(path))
        ? path
        : undefined;
      const key = code + "\u0000" + (safePath ?? "");
      if (seen.has(key)) return;
      seen.add(key);
      diagnostics.push(
        safePath === undefined ? { code } : { code, path: safePath },
      );
    },
    hasAny(codes) {
      return diagnostics.some(({ code }) => codes.has(code));
    },
    sorted() {
      return diagnostics.sort((left, right) =>
        compareText(left.code, right.code) ||
        compareText(left.path ?? "", right.path ?? "")
      );
    },
  };
}

function releaseError(error, diagnostics, fallbackCode, fallbackPath) {
  if (error instanceof ReleaseManifestError) {
    diagnostics.add(error.code, error.path);
  } else {
    diagnostics.add(fallbackCode, fallbackPath);
  }
}

async function readKnownJson(repositoryRoot, relativePath) {
  const bytes = await readReleaseFile(
    repositoryRoot,
    relativePath,
    RELEASE_LIMITS.metadataBytes,
  );
  return JSON.parse(bytes.toString("utf8"));
}

async function readKnownText(repositoryRoot, relativePath) {
  const bytes = await readReleaseFile(
    repositoryRoot,
    relativePath,
    RELEASE_LIMITS.metadataBytes,
  );
  return bytes.toString("utf8");
}

async function collectClosedTree(repositoryRoot, relativeRoot, diagnostics) {
  const collected = [];
  const absoluteRoot = join(repositoryRoot, relativeRoot);
  let rootStats;
  try {
    rootStats = await lstat(absoluteRoot);
  } catch (error) {
    const code = isPlainObject(error) && typeof error.code === "string"
      ? error.code
      : undefined;
    diagnostics.add(
      code === "ENOENT" || code === "ENOTDIR"
        ? "OFF-REL-MISSING"
        : "OFF-REL-IO",
      relativeRoot,
    );
    return collected;
  }
  if (rootStats.isSymbolicLink()) {
    diagnostics.add("OFF-REL-SYMLINK", relativeRoot);
    return collected;
  }
  if (!rootStats.isDirectory()) {
    diagnostics.add("OFF-REL-NOT-FILE", relativeRoot);
    return collected;
  }

  let traversedEntries = 0;
  let exceededLimit = false;

  async function walk(relativeDirectory, depth) {
    if (depth > RELEASE_LIMITS.treeDepth) {
      diagnostics.add("OFF-REL-LIMIT", relativeRoot);
      exceededLimit = true;
      return;
    }
    let directory;
    try {
      directory = await opendir(join(repositoryRoot, relativeDirectory));
    } catch (error) {
      const code = isPlainObject(error) && typeof error.code === "string"
        ? error.code
        : undefined;
      diagnostics.add(
        code === "ENOENT" || code === "ENOTDIR"
          ? "OFF-REL-MISSING"
          : "OFF-REL-IO",
        relativeDirectory,
      );
      return;
    }

    try {
      for await (const entry of directory) {
        traversedEntries += 1;
        if (traversedEntries > RELEASE_LIMITS.treeEntries) {
          diagnostics.add("OFF-REL-LIMIT", relativeRoot);
          exceededLimit = true;
          break;
        }
        const relativePath = relativeDirectory + "/" + entry.name;
        let stats;
        try {
          stats = await lstat(join(repositoryRoot, relativePath));
        } catch (error) {
          const code = isPlainObject(error) && typeof error.code === "string"
            ? error.code
            : undefined;
          diagnostics.add(
            code === "ENOENT" || code === "ENOTDIR"
              ? "OFF-REL-MISSING"
              : "OFF-REL-IO",
            relativePath,
          );
          continue;
        }
        if (stats.isSymbolicLink()) {
          diagnostics.add("OFF-REL-SYMLINK", relativePath);
        } else if (stats.isDirectory()) {
          await walk(relativePath, depth + 1);
        } else if (stats.isFile()) {
          collected.push(relativePath);
        } else {
          diagnostics.add("OFF-REL-NOT-FILE", relativePath);
        }
        if (exceededLimit) break;
      }
    } catch {
      diagnostics.add("OFF-REL-IO", relativeDirectory);
    }
  }

  await walk(relativeRoot, 0);
  return exceededLimit ? [] : collected;
}

function allowedReleaseLocation(path) {
  return requiredTopLevel.includes(path) ||
    closedRoots.some((root) => path.startsWith(root + "/"));
}

function parseEvidenceRecord(markdown) {
  const begin = "<!-- OFF-INTEROPERABILITY-RECORD-BEGIN\n";
  const end = "\nOFF-INTEROPERABILITY-RECORD-END -->";
  const start = markdown.indexOf(begin);
  if (start < 0 || markdown.indexOf(begin, start + begin.length) >= 0) {
    return undefined;
  }
  const finish = markdown.indexOf(end, start + begin.length);
  if (finish < 0 || markdown.indexOf(end, finish + end.length) >= 0) {
    return undefined;
  }
  try {
    const source = markdown.slice(start + begin.length, finish);
    const record = JSON.parse(source);
    return validEvidenceRecordShape(record) ? { record, source } : undefined;
  } catch {
    return undefined;
  }
}

function stringFields(value, keys) {
  return exactKeys(value, keys) &&
    keys.every((key) => typeof value[key] === "string");
}

function validEvidenceRecordShape(record) {
  if (
    !exactKeys(record, [
      "authentication",
      "candidate",
      "gates",
      "independence",
      "recordVersion",
    ]) ||
    record.recordVersion !== "0.1" ||
    typeof record.candidate !== "string" ||
    !stringFields(record.authentication, [
      "checksumManifestSha256",
      "claimBasis",
      "publicHumanReview",
      "publicVcsCommit",
      "reviewEvidencePath",
      "reviewer",
    ]) ||
    !stringFields(record.independence, [
      "claimBasis",
      "distributionNotReverseEngineered",
      "evidencePath",
      "noPrivateGuidance",
      "publicHumanReview",
      "publicMaterialsOnly",
      "relationshipDisclosure",
      "reviewer",
      "sourceCodeNotInspected",
      "status",
      "unaffiliatedImplementer",
    ]) ||
    !exactKeys(record.gates, [
      "adoption",
      "independentConsumer",
      "independentProducer",
      "tenMinuteCoreAuthoring",
    ])
  ) {
    return false;
  }

  return stringFields(record.gates.independentConsumer, [
    "claimBasis",
    "evaluatorFailureVectorsReproduced",
    "evidencePath",
    "implementationLanguage",
    "publicHumanReview",
    "reviewEvidencePath",
    "reviewer",
    "status",
  ]) && stringFields(record.gates.independentProducer, [
    "claimBasis",
    "evidencePath",
    "firstCurrentValidatorResult",
    "firstStaleValidatorResult",
    "packageBytesFrozenBeforeValidation",
    "packageId",
    "postValidationRepairs",
    "publicHumanReview",
    "reviewEvidencePath",
    "reviewer",
    "status",
  ]) && (
    exactKeys(record.gates.tenMinuteCoreAuthoring, [
      "claimBasis",
      "durationSeconds",
      "evidencePath",
      "publicHumanReview",
      "reviewEvidencePath",
      "reviewer",
      "status",
    ]) &&
    (
      typeof record.gates.tenMinuteCoreAuthoring.durationSeconds === "string" ||
      (typeof record.gates.tenMinuteCoreAuthoring.durationSeconds === "number" &&
        Number.isFinite(record.gates.tenMinuteCoreAuthoring.durationSeconds))
    ) &&
    [
      "claimBasis",
      "evidencePath",
      "publicHumanReview",
      "reviewEvidencePath",
      "reviewer",
      "status",
    ].every(
      (key) => typeof record.gates.tenMinuteCoreAuthoring[key] === "string",
    )
  ) && stringFields(record.gates.adoption, [
    "claimBasis",
    "evidencePath",
    "publicHumanReview",
    "reviewEvidencePath",
    "reviewer",
    "status",
  ]);
}

function evidenceStatus(record, group, gate) {
  const collection = isPlainObject(record?.[group]) ? record[group] : undefined;
  const item = isPlainObject(collection?.[gate]) ? collection[gate] : undefined;
  return typeof item?.status === "string" ? item.status : "unavailable";
}

function projectEvidence(record) {
  const authentication = isPlainObject(record?.authentication)
    ? record.authentication
    : undefined;
  return {
    publicVcsCommit: typeof authentication?.publicVcsCommit === "string"
      ? authentication.publicVcsCommit
      : "unavailable",
    checksumManifestDigest:
      typeof authentication?.checksumManifestSha256 === "string"
        ? authentication.checksumManifestSha256
        : "unavailable",
    independentConsumer: evidenceStatus(
      record,
      "gates",
      "independentConsumer",
    ),
    independentProducer: evidenceStatus(
      record,
      "gates",
      "independentProducer",
    ),
    tenMinuteCoreAuthoring: evidenceStatus(
      record,
      "gates",
      "tenMinuteCoreAuthoring",
    ),
    adoption: evidenceStatus(record, "gates", "adoption"),
  };
}

async function sha256GeneratedFile(path) {
  let handle;
  try {
    handle = await open(path, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const stats = await handle.stat({ bigint: true });
    if (!stats.isFile() || stats.size > BigInt(RELEASE_LIMITS.releaseFileBytes)) {
      throw new Error("generated file exceeded limits");
    }
    const hash = createHash("sha256");
    let total = 0;
    const stream = handle.createReadStream({
      autoClose: false,
      highWaterMark: 64 * 1024,
    });
    for await (const chunk of stream) {
      total += chunk.length;
      if (total > RELEASE_LIMITS.releaseFileBytes) {
        throw new Error("generated file exceeded limits");
      }
      hash.update(chunk);
    }
    return hash.digest("hex");
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function checkGeneratedDistribution(
  repositoryRoot,
  diagnostics,
  allowedInputPaths,
) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "off-release-build-"));
  const output = join(temporaryRoot, "off.mjs");
  try {
    await buildDistribution({
      sourceRoot: repositoryRoot,
      outfile: output,
      allowedInputPaths,
    });
    const [generated, checkedIn] = await Promise.all([
      sha256GeneratedFile(output),
      sha256ReleaseFile(repositoryRoot, "dist/off.mjs"),
    ]);
    if (generated !== checkedIn) {
      diagnostics.add("OFF-REL-DIST-DRIFT", "dist/off.mjs");
    }
  } catch {
    diagnostics.add("OFF-REL-DIST-BUILD", "dist/off.mjs");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function validateChecksumShape(value) {
  return (
    exactKeys(value, [
      "algorithm",
      "authentication",
      "candidate",
      "files",
      "formatVersion",
      "purpose",
    ]) &&
    value.algorithm === "sha256" &&
    value.formatVersion === "0.1" &&
    value.purpose === "drift-detection-only" &&
    typeof value.candidate === "string" &&
    exactKeys(value.authentication, [
      "checksumManifestSha256",
      "publicVcsCommit",
    ]) &&
    isPlainObject(value.files)
  );
}

export async function validateRelease(repositoryRoot = defaultRepositoryRoot) {
  const root = resolve(repositoryRoot);
  const diagnostics = diagnosticCollector();
  let allowlist;
  let candidate = EXPECTED_CANDIDATE;
  let rawAllowlist;
  let record;
  let recordSource;
  let checksums;

  try {
    const rootStats = await lstat(root);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
      diagnostics.add("OFF-REL-SYMLINK", ".");
    }
  } catch (error) {
    const code = isPlainObject(error) && typeof error.code === "string"
      ? error.code
      : undefined;
    diagnostics.add(
      code === "ENOENT" || code === "ENOTDIR"
        ? "OFF-REL-MISSING"
        : "OFF-REL-IO",
      ".",
    );
  }

  try {
    rawAllowlist = await readKnownJson(root, ALLOWLIST_PATH);
    if (isPlainObject(rawAllowlist) && typeof rawAllowlist.candidate === "string") {
      candidate = rawAllowlist.candidate;
    }
    allowlist = parseAllowlist(rawAllowlist);
  } catch (error) {
    releaseError(error, diagnostics, "OFF-REL-ALLOWLIST-SHAPE", ALLOWLIST_PATH);
  }

  if (candidate !== EXPECTED_CANDIDATE) {
    diagnostics.add("OFF-REL-CANDIDATE", ALLOWLIST_PATH);
  }

  if (allowlist !== undefined) {
    const allowlisted = new Set(allowlist.files);
    for (const path of requiredTopLevel) {
      if (!allowlisted.has(path)) {
        diagnostics.add("OFF-REL-UNLISTED", path);
      }
    }
    for (const path of allowlist.files) {
      if (!allowedReleaseLocation(path)) {
        diagnostics.add("OFF-REL-UNEXPECTED", path);
      }
      try {
        await inspectReleaseFile(root, path);
      } catch (error) {
        releaseError(error, diagnostics, "OFF-REL-MISSING", path);
      }
    }
    for (const closedRoot of closedRoots) {
      const actualFiles = await collectClosedTree(root, closedRoot, diagnostics);
      for (const path of actualFiles) {
        if (!allowlisted.has(path)) {
          diagnostics.add("OFF-REL-UNLISTED", path);
        }
      }
    }
  }

  try {
    const packageDocument = await readKnownJson(root, "package.json");
    if (
      !isPlainObject(packageDocument) ||
      packageDocument.version !== expectedPackageVersion
    ) {
      diagnostics.add("OFF-REL-CANDIDATE", "package.json");
    }
  } catch (error) {
    releaseError(error, diagnostics, "OFF-REL-MISSING", "package.json");
  }

  try {
    const changelog = await readKnownText(root, "CHANGELOG.md");
    if (!changelog.includes("## v0.1-rc.1")) {
      diagnostics.add("OFF-REL-CANDIDATE", "CHANGELOG.md");
    }
  } catch (error) {
    releaseError(error, diagnostics, "OFF-REL-MISSING", "CHANGELOG.md");
  }

  try {
    const releaseReadme = await readKnownText(
      root,
      "release/v0.1-rc.1/README.md",
    );
    if (!releaseReadme.startsWith("# Open Finance Format v0.1-rc.1\n")) {
      diagnostics.add(
        "OFF-REL-CANDIDATE",
        "release/v0.1-rc.1/README.md",
      );
    }
  } catch (error) {
    releaseError(
      error,
      diagnostics,
      "OFF-REL-MISSING",
      "release/v0.1-rc.1/README.md",
    );
  }

  try {
    const report = await readKnownText(root, reportPath);
    const parsedRecord = parseEvidenceRecord(report);
    if (parsedRecord === undefined) {
      diagnostics.add("OFF-REL-EVIDENCE-RECORD", reportPath);
    } else {
      record = parsedRecord.record;
      recordSource = parsedRecord.source;
      if (record.candidate !== candidate) {
        diagnostics.add("OFF-REL-CANDIDATE", reportPath);
      }
    }
  } catch (error) {
    releaseError(error, diagnostics, "OFF-REL-MISSING", reportPath);
  }

  const evidence = record === undefined
    ? { ...pendingEvidence }
    : projectEvidence(record);
  if (
    candidate === EXPECTED_CANDIDATE &&
    record !== undefined &&
    (
      !isDeepStrictEqual(record, pendingInteroperabilityRecord) ||
      recordSource !== JSON.stringify(pendingInteroperabilityRecord, null, 2)
    )
  ) {
    diagnostics.add("OFF-REL-RC1-EVIDENCE", reportPath);
  }
  if (candidate === "v0.1") {
    diagnostics.add("OFF-REL-PROMOTION-EVIDENCE", reportPath);
  }

  try {
    checksums = await readKnownJson(root, CHECKSUMS_PATH);
    if (!validateChecksumShape(checksums)) {
      diagnostics.add("OFF-REL-CHECKSUM-SHAPE", CHECKSUMS_PATH);
      checksums = undefined;
    }
  } catch (error) {
    releaseError(error, diagnostics, "OFF-REL-MISSING", CHECKSUMS_PATH);
  }

  if (checksums !== undefined && allowlist !== undefined) {
    if (checksums.candidate !== candidate) {
      diagnostics.add("OFF-REL-CANDIDATE", CHECKSUMS_PATH);
    }
    if (
      checksums.authentication.publicVcsCommit !== "pending" ||
      checksums.authentication.checksumManifestSha256 !== "pending"
    ) {
      diagnostics.add("OFF-REL-CHECKSUM-AUTH", CHECKSUMS_PATH);
    }
    const expectedPaths = allowlist.files.filter(
      (path) => !allowlist.checksumExclusions.includes(path),
    );
    const checksumPaths = Object.keys(checksums.files);
    if (
      JSON.stringify(checksumPaths) !== JSON.stringify(expectedPaths) ||
      !checksumPaths.every(
        (path) => /^[0-9a-f]{64}$/u.test(String(checksums.files[path])),
      )
    ) {
      diagnostics.add("OFF-REL-CHECKSUM-SHAPE", CHECKSUMS_PATH);
    } else {
      const hashBudget = {
        consumed: 0,
        limit: RELEASE_LIMITS.totalReleaseBytes,
      };
      for (const path of expectedPaths) {
        try {
          const actual = await sha256ReleaseFile(root, path, hashBudget);
          if (actual !== checksums.files[path]) {
            diagnostics.add("OFF-REL-CHECKSUM", path);
          }
        } catch (error) {
          releaseError(error, diagnostics, "OFF-REL-MISSING", path);
          if (
            error instanceof ReleaseManifestError &&
            error.code === "OFF-REL-LIMIT" &&
            hashBudget.consumed > hashBudget.limit
          ) {
            break;
          }
        }
      }
    }
  }

  const unsafeBuildDiagnostics = new Set([
    "OFF-REL-ALLOWLIST-CASE",
    "OFF-REL-ALLOWLIST-EXCLUSION",
    "OFF-REL-ALLOWLIST-ORDER",
    "OFF-REL-ALLOWLIST-SHAPE",
    "OFF-REL-CHECKSUM",
    "OFF-REL-CHECKSUM-SHAPE",
    "OFF-REL-IO",
    "OFF-REL-LIMIT",
    "OFF-REL-MISSING",
    "OFF-REL-MUTATED",
    "OFF-REL-NOT-FILE",
    "OFF-REL-SYMLINK",
    "OFF-REL-UNEXPECTED",
    "OFF-REL-UNLISTED",
    "OFF-REL-UNSAFE-PATH",
  ]);
  if (!diagnostics.hasAny(unsafeBuildDiagnostics)) {
    await checkGeneratedDistribution(root, diagnostics, allowlist?.files ?? []);
  }

  const sortedDiagnostics = diagnostics.sorted();
  return {
    kind: "releaseValidation",
    candidate,
    ok: sortedDiagnostics.length === 0,
    evidence,
    diagnostics: sortedDiagnostics,
  };
}

function parseArguments(args) {
  if (args.length === 0) return defaultRepositoryRoot;
  if (args.length === 2 && args[0] === "--root" && args[1].length > 0) {
    return resolve(args[1]);
  }
  return undefined;
}

async function run() {
  const repositoryRoot = parseArguments(process.argv.slice(2));
  if (repositoryRoot === undefined) {
    process.stderr.write(
      "Usage: node scripts/release-validate.mjs [--root <immutable-checkout>]\n",
    );
    process.exitCode = 64;
    return;
  }
  try {
    const result = await validateRelease(repositoryRoot);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exitCode = result.ok ? 0 : 1;
  } catch {
    const result = {
      kind: "releaseValidation",
      candidate: EXPECTED_CANDIDATE,
      ok: false,
      evidence: pendingEvidence,
      diagnostics: [{ code: "OFF-REL-INTERNAL" }],
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await run();
