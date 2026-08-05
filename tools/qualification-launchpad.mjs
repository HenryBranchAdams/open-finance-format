import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const launchpadRepositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const gitEnvironment = {
  ...process.env,
  GIT_NO_REPLACE_OBJECTS: "1",
};
for (const variable of [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
]) {
  delete gitEnvironment[variable];
}

export const CANDIDATE = "v0.1-rc.1";
export const CHECKSUM_MANIFEST = "release/v0.1-rc.1/checksums.json";
export const REQUIRED_MATERIALS = Object.freeze([
  {
    source: "release/v0.1-rc.1/README.md",
    target: "candidate/release-README.md",
  },
  {
    source: "release/v0.1-rc.1/files.json",
    target: "candidate/files.json",
  },
  {
    source: CHECKSUM_MANIFEST,
    target: "candidate/checksums.json",
  },
  {
    source: "clean-room/CONSUMER_TASK.md",
    target: "tasks/CONSUMER_TASK.md",
  },
  {
    source: "clean-room/PRODUCER_TASK.md",
    target: "tasks/PRODUCER_TASK.md",
  },
  {
    source: "clean-room/INTEROPERABILITY_REPORT.template.md",
    target: "tasks/INTEROPERABILITY_REPORT.template.md",
  },
]);

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const PENDING = "pending";

export class QualificationLaunchpadError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "QualificationLaunchpadError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new QualificationLaunchpadError(code, message, details);
}

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isWithin(path, root) {
  const relation = relative(root, path);
  return relation === "" ||
    (relation !== ".." &&
      !relation.startsWith(".." + sep) &&
      !relation.startsWith(sep));
}

async function existingParent(path) {
  let current = dirname(path);
  while (true) {
    try {
      return await realpath(current);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        const next = dirname(current);
        if (next === current) throw error;
        current = next;
        continue;
      }
      throw error;
    }
  }
}

async function git(repositoryRoot, args) {
  try {
    const result = await execute("git", ["-C", repositoryRoot, ...args], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      env: gitEnvironment,
    });
    return result.stdout.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(
      "frozen_candidate_unavailable",
      "Unable to inspect the candidate checkout: " + message,
      { repositoryRoot, args },
    );
  }
}

async function gitBytes(repositoryRoot, args) {
  try {
    const result = await execute("git", ["-C", repositoryRoot, ...args], {
      encoding: null,
      maxBuffer: 32 * 1024 * 1024,
      env: gitEnvironment,
    });
    return result.stdout;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(
      "frozen_candidate_unavailable",
      "Unable to read the pinned candidate object: " + message,
      { repositoryRoot, args },
    );
  }
}

async function resolvedCandidateRoot(candidateRoot) {
  try {
    return await realpath(resolve(candidateRoot));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      fail(
        "frozen_candidate_unavailable",
        "The candidate checkout is not available at the supplied path.",
        { candidateRoot: resolve(candidateRoot) },
      );
    }
    throw error;
  }
}

async function pinnedCandidateCommit() {
  const handoffPath = join(launchpadRepositoryRoot, "docs/handoff.yaml");
  try {
    const handoff = await readFile(handoffPath, "utf8");
    const pinned = handoff.match(/pinned_git_snapshot:\s*([0-9a-f]{40})/u)?.[1];
    if (pinned === undefined) throw new Error("pinned_git_snapshot is missing");
    return pinned;
  } catch (error) {
    fail(
      "frozen_candidate_unavailable",
      "The local handoff does not expose the pinned v0.1-rc.1 Git snapshot.",
      { handoff: handoffPath, message: error instanceof Error ? error.message : String(error) },
    );
  }
}

async function requireRegularFile(root, relativePath) {
  const absolutePath = join(root, relativePath);
  let entry;
  try {
    entry = await lstat(absolutePath);
  } catch {
    fail(
      "candidate_material_missing",
      "Candidate material is missing: " + relativePath,
      { path: relativePath },
    );
  }
  if (!entry.isFile() || entry.isSymbolicLink()) {
    fail(
      "candidate_material_invalid",
      "Candidate material is not a regular file: " + relativePath,
      { path: relativePath },
    );
  }
  return absolutePath;
}

function parseArguments(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help") return { help: true };
    if (
      !flag?.startsWith("--") ||
      args[index + 1] === undefined ||
      args[index + 1].startsWith("--")
    ) {
      fail(
        "invalid_arguments",
        "Expected --candidate-root, --public-commit, --checksum-manifest-sha256, --output, and optional --created-at arguments.",
      );
    }
    const key = flag.slice(2);
    if (
      ![
        "candidate-root",
        "public-commit",
        "checksum-manifest-sha256",
        "output",
        "created-at",
      ].includes(key)
    ) {
      fail("invalid_arguments", "Unknown argument: " + flag);
    }
    if (values[key] !== undefined) {
      fail("invalid_arguments", "Duplicate argument: " + flag);
    }
    values[key] = args[index + 1];
    index += 1;
  }
  return values;
}

function helpText() {
  return [
    "Prepare a non-normative OFF v0.1-rc.1 clean-room launchpad.",
    "",
    "Usage:",
    "  node tools/qualification-launchpad.mjs \\",
    "    --candidate-root <authenticated-clean-checkout> \\",
    "    --public-commit <40-char-commit> \\",
    "    --checksum-manifest-sha256 <64-char-digest> \\",
    "    --output <external-attempt-directory> \\",
    "    [--created-at <whole-second-UTC-timestamp>]",
  ].join("\n");
}

function sequenceDocument({ publicCommit, checksumManifestSha256 }) {
  return [
    "# OFF v0.1-rc.1 clean-room sequence",
    "",
    "This file is a non-normative launchpad projection. It does not authenticate the",
    "publisher, establish independence, or record public review.",
    "",
    "## Candidate preflight",
    "",
    "- Candidate: " + CANDIDATE,
    "- Supplied immutable public commit: " + publicCommit,
    "- Supplied checksum-manifest SHA-256: " + checksumManifestSha256,
    "- Local checkout and digest checks: passed by the launchpad",
    "- Public authentication: pending external verification",
    "",
    "## Ordered handoff",
    "",
    "1. A trusted coordinator verifies the immutable public commit and checksum digest through the required authenticated channels.",
    "2. An eligible unaffiliated implementer receives only the authenticated public candidate materials and the consumer task.",
    "3. The consumer freezes alternate-language normalized bytes, diagnostics, freshness, lineage, and evaluator-failure evidence before any reference comparison.",
    "4. The same eligible process receives the producer task and performs the distinct producer and timed Core-authoring exercises under their separate freeze and timing rules.",
    "5. A copied interoperability report records author-claimed evidence while preserving the rc.1 template as all-pending.",
    "6. A named public human reviewer checks the immutable evidence before any promotion decision.",
    "",
    "## Evidence and restart rules",
    "",
    "- Keep the copied report, immutable attempt bytes, inventories, digests, commands, runtimes, timestamps, and diagnostics together.",
    "- Preserve the first consumer comparison and the first producer validator result at each required timestamp; do not replace a failed attempt with a repaired result.",
    "- Label completed participant claims author-claimed until a named public human reviewer records a public review. Local tools cannot set independence, public review, or promotion.",
    "- Record public-contract ambiguity without a private answer. A clarification requires a new immutable candidate and a complete restart.",
    "- Treat evaluator or environment failures separately from package rejection and record any authorized rerun without changing the frozen bytes.",
    "",
    "## Reviewer handoff",
    "",
    "The coordinator publishes the immutable evidence path and relationship disclosures, then asks a named public human reviewer to verify the candidate anchors, source restrictions, first-result rules, digests, and claim-state transitions. The reviewer records a review result in a new copied report or review record; never edit the candidate template.",
    "",
    "## Boundary",
    "",
    "This launchpad performs no implementation, validator run, network operation,",
    "publication, recruitment, credential use, or external evidence mutation.",
    "",
  ].join("\n");
}

function manifest({
  publicCommit,
  pinnedCommit,
  checksumManifestSha256,
  createdAt,
  artifactInventory,
  allowlist,
  checksumManifest,
  verifierCheckout,
  localChecks,
}) {
  return {
    manifestVersion: "0.1",
    kind: "offQualificationLaunchpad",
    candidate: CANDIDATE,
    createdAt,
    frozenSnapshot: {
      pinnedGitCommit: pinnedCommit,
      artifactRoot: "release/v0.1-rc.1",
      releaseRoot: "immutable-checkout",
      allowlistPath: "release/v0.1-rc.1/files.json",
      allowlistSha256: allowlist.sha256,
      artifactInventory,
      artifactInventorySha256: allowlist.inventorySha256,
    },
    checksumManifest: {
      path: CHECKSUM_MANIFEST,
      algorithm: "sha256",
      bytesHashed: checksumManifest.bytesHashed,
      sha256: checksumManifestSha256,
      exactBytes: "the raw checked-out bytes at the path above, including their final LF",
    },
    authentication: {
      suppliedPublicVcsCommit: publicCommit,
      suppliedChecksumManifestSha256: checksumManifestSha256,
      localPreflight: "verified",
      publicVcsCommit: "pending",
      checksumManifestDigest: "pending",
      publicHumanReview: "pending",
    },
    publicAnchors: {
      publicVcsCommit: {
        status: "pending",
        directlyObserved: false,
        evidenceClass: "explicitly-unverified",
        basis: "No external authenticated channel was accessed under local-only authority.",
      },
      checksumManifestSha256: {
        status: "pending",
        directlyObserved: false,
        evidenceClass: "explicitly-unverified",
        basis: "The digest was checked locally but not authenticated through an external channel.",
      },
    },
    verifierCheckout,
    localChecks,
    retryPolicy: {
      noImplicitRetry: true,
      snapshotBinding: "Every invocation must supply the exact full commit and checksum-manifest digest again.",
      failureBehavior: "Refuse before creating output or refuse an existing output; never overwrite or bless a different snapshot.",
    },
    independence: "pending",
    gates: {
      independentConsumer: "pending",
      independentProducer: "pending",
      tenMinuteCoreAuthoring: "pending",
      adoption: "notEvaluated",
    },
    sequence: [
      "authenticated-public-anchor",
      "independent-consumer",
      "freeze-and-compare",
      "independent-producer",
      "timed-core-authoring",
      "public-human-review",
    ],
    sourceMaterials: REQUIRED_MATERIALS.map(({ source, target }) => ({
      source,
      target,
    })),
    prohibitedEffects: [
      "implementation",
      "validator-execution",
      "network-operation",
      "publication",
      "recruitment",
      "credential-use",
      "external-evidence-mutation",
    ],
  };
}

export async function prepareQualificationLaunchpad({
  candidateRoot,
  publicCommit,
  checksumManifestSha256,
  outputRoot,
  createdAt = "2026-08-04T00:00:00Z",
}) {
  if (typeof candidateRoot !== "string" || candidateRoot.length === 0) {
    fail("invalid_arguments", "candidateRoot is required.");
  }
  if (typeof outputRoot !== "string" || outputRoot.length === 0) {
    fail("invalid_arguments", "outputRoot is required.");
  }
  if (publicCommit === PENDING || checksumManifestSha256 === PENDING) {
    fail(
      "external_anchor_pending",
      "The public commit and checksum-manifest digest must be supplied explicitly; pending anchors cannot launch a qualification bundle.",
    );
  }
  if (typeof publicCommit !== "string" || !SHA1.test(publicCommit)) {
    fail("invalid_public_commit", "publicCommit must be a full lowercase SHA-1 commit.");
  }
  if (
    typeof checksumManifestSha256 !== "string" ||
    !SHA256.test(checksumManifestSha256)
  ) {
    fail(
      "invalid_checksum_digest",
      "checksumManifestSha256 must be a lowercase SHA-256 digest.",
    );
  }
  if (
    typeof createdAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(createdAt)
  ) {
    fail("invalid_created_at", "createdAt must be a whole-second UTC timestamp.");
  }

  const pinnedCommit = await pinnedCandidateCommit();
  if (publicCommit !== pinnedCommit) {
    fail(
      "frozen_candidate_drift",
      "The supplied public commit is not the pinned v0.1-rc.1 snapshot recorded by the local handoff.",
      { expected: pinnedCommit, actual: publicCommit },
    );
  }

  const candidatePath = await resolvedCandidateRoot(candidateRoot);
  const candidateRepository = await git(candidatePath, [
    "rev-parse",
    "--show-toplevel",
  ]);
  const candidateRepositoryPath = await realpath(candidateRepository);
  if (candidateRepositoryPath !== candidatePath) {
    fail(
      "candidate_root_not_repository",
      "candidateRoot must be the clean repository root.",
    );
  }
  const head = await git(candidatePath, ["rev-parse", "HEAD"]);
  if (head !== publicCommit) {
    fail(
      "frozen_candidate_drift",
      "The supplied public commit does not match the candidate checkout HEAD.",
      { expected: publicCommit, actual: head },
    );
  }
  const status = await git(candidatePath, [
    "-c",
    "status.showUntrackedFiles=all",
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--ignored=traditional",
    "--ignore-submodules=none",
  ]);
  if (status.length > 0) {
    fail(
      "candidate_checkout_dirty",
      "The candidate checkout must be clean before a launchpad is prepared.",
      { status },
    );
  }

  const checksumsPath = await requireRegularFile(candidatePath, CHECKSUM_MANIFEST);
  const checksumBytes = await readFile(checksumsPath);
  const pinnedChecksumBytes = await gitBytes(candidatePath, [
    "cat-file",
    "blob",
    `${publicCommit}:${CHECKSUM_MANIFEST}`,
  ]);
  if (!checksumBytes.equals(pinnedChecksumBytes)) {
    fail(
      "frozen_candidate_drift",
      "The checked-out checksum manifest differs from the pinned Git object.",
      { path: CHECKSUM_MANIFEST },
    );
  }
  const actualChecksumManifestSha256 = digest(checksumBytes);
  if (actualChecksumManifestSha256 !== checksumManifestSha256) {
    fail(
      "checksum_digest_mismatch",
      "The supplied checksum-manifest digest does not match the candidate checkout.",
      { expected: checksumManifestSha256, actual: actualChecksumManifestSha256 },
    );
  }
  const checksums = JSON.parse(checksumBytes.toString("utf8"));
  if (
    checksums.candidate !== CANDIDATE ||
    checksums.authentication?.publicVcsCommit !== PENDING ||
    checksums.authentication?.checksumManifestSha256 !== PENDING
  ) {
    fail(
      "candidate_authentication_mutated",
      "The frozen candidate checksum manifest must retain its all-pending authentication fields.",
    );
  }
  const filesPath = await requireRegularFile(
    candidatePath,
    "release/v0.1-rc.1/files.json",
  );
  const filesBytes = await readFile(filesPath);
  const pinnedFilesBytes = await gitBytes(candidatePath, [
    "cat-file",
    "blob",
    `${publicCommit}:release/v0.1-rc.1/files.json`,
  ]);
  if (!filesBytes.equals(pinnedFilesBytes)) {
    fail(
      "frozen_candidate_drift",
      "The checked-out candidate allowlist differs from the pinned Git object.",
      { path: "release/v0.1-rc.1/files.json" },
    );
  }
  const files = JSON.parse(filesBytes.toString("utf8"));
  if (files.candidate !== CANDIDATE || files.releaseRoot !== "immutable-checkout") {
    fail(
      "candidate_allowlist_invalid",
      "The candidate allowlist is not the frozen v0.1-rc.1 allowlist.",
    );
  }
  for (const { source } of REQUIRED_MATERIALS) {
    await requireRegularFile(candidatePath, source);
  }

  let outputPath = resolve(outputRoot);
  const outputParent = await existingParent(outputPath);
  if (
    isWithin(outputParent, candidateRepositoryPath) ||
    isWithin(outputPath, candidateRepositoryPath)
  ) {
    fail(
      "unsafe_output_path",
      "The attempt directory must be outside the candidate repository.",
      { output: outputPath, repository: candidateRepositoryPath },
    );
  }
  const allowlistPaths = files.files;
  if (
    !Array.isArray(allowlistPaths) ||
    allowlistPaths.some((path) => typeof path !== "string")
  ) {
    fail(
      "candidate_allowlist_invalid",
      "The candidate allowlist must contain only relative file paths.",
    );
  }
  const checksumPaths = Object.keys(checksums.files ?? {});
  const expectedChecksumPaths = allowlistPaths
    .filter((path) => path !== CHECKSUM_MANIFEST)
    .slice()
    .sort();
  if (
    JSON.stringify(checksumPaths.slice().sort()) !==
    JSON.stringify(expectedChecksumPaths)
  ) {
    fail(
      "candidate_allowlist_invalid",
      "The checksum manifest does not cover exactly the non-self-excluded allowlist files.",
      { allowlistPaths: expectedChecksumPaths, checksumPaths: checksumPaths.slice().sort() },
    );
  }
  const trackedFlags = new Map(
    (await gitBytes(candidatePath, ["ls-files", "-v", "-z"]))
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((entry) => [entry.slice(2), entry.slice(0, 1)]),
  );
  for (const relativePath of allowlistPaths) {
    if (trackedFlags.get(relativePath) !== "H") {
      fail(
        "frozen_candidate_drift",
        "An allowlisted path is not represented by a normal Git index entry.",
        { path: relativePath, flag: trackedFlags.get(relativePath) ?? null },
      );
    }
  }
  const artifactInventory = [];
  const verifiedBytes = new Map([[CHECKSUM_MANIFEST, pinnedChecksumBytes]]);
  for (const relativePath of expectedChecksumPaths) {
    const artifactPath = await requireRegularFile(candidatePath, relativePath);
    const artifactBytes = await readFile(artifactPath);
    const pinnedBytes = await gitBytes(candidatePath, [
      "cat-file",
      "blob",
      `${publicCommit}:${relativePath}`,
    ]);
    if (!artifactBytes.equals(pinnedBytes)) {
      fail(
        "frozen_candidate_drift",
        "A checked-out candidate artifact differs from its pinned Git object.",
        { path: relativePath },
      );
    }
    const actual = digest(pinnedBytes);
    const expected = checksums.files[relativePath];
    if (actual !== expected) {
      fail(
        "frozen_candidate_drift",
        "A frozen candidate artifact does not match its checksum manifest.",
        { path: relativePath, expected, actual },
      );
    }
    artifactInventory.push({
      path: relativePath,
      bytes: pinnedBytes.length,
      sha256: actual,
    });
    verifiedBytes.set(relativePath, pinnedBytes);
  }
  const inventoryBytes = Buffer.from(JSON.stringify(artifactInventory) + "\n", "utf8");
  const localChecks = [
    {
      name: "candidate-root",
      command: "git -C <candidate-root> rev-parse --show-toplevel",
      status: "pass",
      value: candidateRepositoryPath,
    },
    {
      name: "candidate-head",
      command: "git -C <candidate-root> rev-parse HEAD",
      status: "pass",
      value: head,
    },
    {
      name: "pinned-candidate-binding",
      command: "read docs/handoff.yaml pinned_git_snapshot from the launchpad authority checkout",
      status: "pass",
      value: pinnedCommit,
    },
    {
      name: "candidate-status",
      command: "git -C <candidate-root> -c status.showUntrackedFiles=all status --porcelain=v1 --untracked-files=all --ignored=traditional --ignore-submodules=none",
      status: "pass",
      value: "",
    },
    {
      name: "checksum-manifest-sha256",
      command: "sha256sum release/v0.1-rc.1/checksums.json",
      status: "pass",
      value: checksumManifestSha256,
    },
    {
      name: "allowlist-byte-verification",
      command: "verify each files.json path against checksums.json",
      status: "pass",
      value: artifactInventory.length,
    },
  ];
  try {
    await stat(outputPath);
    fail(
      "output_exists",
      "The launchpad refuses to overwrite an existing attempt directory.",
      { output: outputPath },
    );
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ENOENT")) {
      throw error;
    }
  }
  await mkdir(outputPath, { recursive: true });
  outputPath = await realpath(outputPath);
  if (isWithin(outputPath, candidateRepositoryPath)) {
    fail(
      "unsafe_output_path",
      "The resolved attempt directory is not outside the candidate repository.",
      { output: outputPath, repository: candidateRepositoryPath },
    );
  }
  for (const { source, target } of REQUIRED_MATERIALS) {
    const destination = join(outputPath, target);
    await mkdir(dirname(destination), { recursive: true });
    const bytes = verifiedBytes.get(source);
    if (bytes === undefined) {
      fail(
        "candidate_material_missing",
        "A required copied material was not present in the verified allowlist.",
        { path: source },
      );
    }
    await writeFile(destination, bytes, { flag: "wx" });
  }
  await writeFile(
    join(outputPath, "qualification-sequence.md"),
    sequenceDocument({ publicCommit, checksumManifestSha256 }),
    "utf8",
  );
  const outputManifest = manifest({
    publicCommit,
    pinnedCommit,
    checksumManifestSha256,
    createdAt,
    artifactInventory,
    allowlist: {
      sha256: digest(await readFile(filesPath)),
      inventorySha256: digest(inventoryBytes),
    },
    checksumManifest: { bytesHashed: checksumBytes.length },
    verifierCheckout: {
      repositoryRoot: candidateRepositoryPath,
      head,
      status: "clean",
      trustStatus: "unverified",
      trustBasis: "Local content and checksum verification only; public authentication remains pending.",
    },
    localChecks,
  });
  await writeFile(
    join(outputPath, "launchpad.json"),
    JSON.stringify(outputManifest, null, 2) + "\n",
    "utf8",
  );

  return {
    kind: outputManifest.kind,
    candidate: CANDIDATE,
    outputRoot: outputPath,
    files: [
      ...REQUIRED_MATERIALS.map(({ target }) => target),
      "qualification-sequence.md",
      "launchpad.json",
    ],
    manifest: outputManifest,
  };
}

async function main() {
  try {
    const values = parseArguments(process.argv.slice(2));
    if (values.help) {
      process.stdout.write(helpText() + "\n");
      return;
    }
    const result = await prepareQualificationLaunchpad({
      candidateRoot: values["candidate-root"],
      publicCommit: values["public-commit"],
      checksumManifestSha256: values["checksum-manifest-sha256"],
      outputRoot: values.output,
      createdAt: values["created-at"] ?? "2026-08-04T00:00:00Z",
    });
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    const result =
      error instanceof QualificationLaunchpadError
        ? {
            kind: "offQualificationLaunchpad",
            ok: false,
            code: error.code,
            message: error.message,
            details: error.details,
          }
        : {
            kind: "offQualificationLaunchpad",
            ok: false,
            code: "internal_error",
            message: error instanceof Error ? error.message : String(error),
          };
    process.stderr.write(JSON.stringify(result, null, 2) + "\n");
    process.exitCode = 1;
  }
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await main();
