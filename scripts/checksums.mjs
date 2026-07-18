import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, opendir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EXPECTED_CANDIDATE = "v0.1-rc.1";
export const ALLOWLIST_PATH = "release/v0.1-rc.1/files.json";
export const CHECKSUMS_PATH = "release/v0.1-rc.1/checksums.json";
export const RELEASE_LIMITS = Object.freeze({
  directoryEntries: 100_000,
  manifestFiles: 10_000,
  metadataBytes: 1 * 1024 * 1024,
  releaseFileBytes: 64 * 1024 * 1024,
  totalReleaseBytes: 512 * 1024 * 1024,
  treeDepth: 32,
  treeEntries: 100_000,
});

const defaultRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedKeys = [
  "candidate",
  "checksumExclusions",
  "files",
  "formatVersion",
  "releaseRoot",
];

export class ReleaseManifestError extends Error {
  constructor(code, path) {
    super(code);
    this.name = "ReleaseManifestError";
    this.code = code;
    this.path = path;
  }
}

export function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isSafeReleasePath(path) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    path.length > 512 ||
    !/^[A-Za-z0-9._/-]+$/u.test(path) ||
    path.startsWith("/") ||
    path.endsWith("/")
  ) {
    return false;
  }
  const segments = path.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort(compareText)) ===
    JSON.stringify([...expected].sort(compareText));
}

function fileSystemError(error, relativePath) {
  const code = isPlainObject(error) && typeof error.code === "string"
    ? error.code
    : undefined;
  if (code === "ENOENT" || code === "ENOTDIR") {
    return new ReleaseManifestError("OFF-REL-MISSING", relativePath);
  }
  if (code === "ELOOP") {
    return new ReleaseManifestError("OFF-REL-SYMLINK", relativePath);
  }
  return new ReleaseManifestError("OFF-REL-IO", relativePath);
}

export function parseAllowlist(value) {
  if (!isPlainObject(value) || !exactKeys(value, allowedKeys)) {
    throw new ReleaseManifestError("OFF-REL-ALLOWLIST-SHAPE", ALLOWLIST_PATH);
  }
  if (
    value.formatVersion !== "0.1" ||
    typeof value.candidate !== "string" ||
    value.releaseRoot !== "immutable-checkout" ||
    !Array.isArray(value.files) ||
    value.files.length > RELEASE_LIMITS.manifestFiles ||
    !value.files.every((path) => typeof path === "string") ||
    !Array.isArray(value.checksumExclusions) ||
    !value.checksumExclusions.every((path) => typeof path === "string")
  ) {
    throw new ReleaseManifestError("OFF-REL-ALLOWLIST-SHAPE", ALLOWLIST_PATH);
  }

  for (const path of [...value.files, ...value.checksumExclusions]) {
    if (!isSafeReleasePath(path)) {
      throw new ReleaseManifestError("OFF-REL-UNSAFE-PATH", ALLOWLIST_PATH);
    }
  }
  if (
    new Set(value.files).size !== value.files.length ||
    JSON.stringify(value.files) !==
      JSON.stringify([...value.files].sort(compareText))
  ) {
    throw new ReleaseManifestError("OFF-REL-ALLOWLIST-ORDER", ALLOWLIST_PATH);
  }
  if (
    new Set(value.files.map((path) => path.toLowerCase())).size !==
      value.files.length
  ) {
    throw new ReleaseManifestError("OFF-REL-ALLOWLIST-CASE", ALLOWLIST_PATH);
  }
  if (
    JSON.stringify(value.checksumExclusions) !==
      JSON.stringify([CHECKSUMS_PATH]) ||
    !value.files.includes(CHECKSUMS_PATH)
  ) {
    throw new ReleaseManifestError("OFF-REL-ALLOWLIST-EXCLUSION", ALLOWLIST_PATH);
  }
  return value;
}

export async function readAllowlist(repositoryRoot) {
  const bytes = await readReleaseFile(
    repositoryRoot,
    ALLOWLIST_PATH,
    RELEASE_LIMITS.metadataBytes,
  );
  return parseAllowlist(JSON.parse(bytes.toString("utf8")));
}

async function findExactDirectoryEntry(directory, segment, relativePath) {
  let handle;
  try {
    handle = await opendir(directory);
  } catch (error) {
    throw fileSystemError(error, relativePath);
  }

  let found = false;
  let entries = 0;
  try {
    for await (const entry of handle) {
      entries += 1;
      if (entries > RELEASE_LIMITS.directoryEntries) {
        throw new ReleaseManifestError("OFF-REL-LIMIT", relativePath);
      }
      if (entry.name === segment) found = true;
    }
  } catch (error) {
    if (error instanceof ReleaseManifestError) throw error;
    throw fileSystemError(error, relativePath);
  }
  if (!found) {
    throw new ReleaseManifestError("OFF-REL-MISSING", relativePath);
  }
}

export async function inspectReleaseFile(repositoryRoot, relativePath) {
  if (!isSafeReleasePath(relativePath)) {
    throw new ReleaseManifestError("OFF-REL-UNSAFE-PATH", relativePath);
  }
  let root;
  try {
    root = await lstat(repositoryRoot);
  } catch (error) {
    throw fileSystemError(error, ".");
  }
  if (!root.isDirectory() || root.isSymbolicLink()) {
    throw new ReleaseManifestError("OFF-REL-SYMLINK", ".");
  }

  const segments = relativePath.split("/");
  let current = repositoryRoot;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    await findExactDirectoryEntry(current, segment, relativePath);
    current = join(current, segment);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      throw fileSystemError(error, relativePath);
    }
    if (stats.isSymbolicLink()) {
      throw new ReleaseManifestError("OFF-REL-SYMLINK", relativePath);
    }
    const final = index === segments.length - 1;
    if ((!final && !stats.isDirectory()) || (final && !stats.isFile())) {
      throw new ReleaseManifestError("OFF-REL-NOT-FILE", relativePath);
    }
  }
  return current;
}

function sameFileState(left, right) {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

async function consumeReleaseFile(
  repositoryRoot,
  relativePath,
  maxBytes,
  consume,
  budget,
) {
  const absolutePath = await inspectReleaseFile(repositoryRoot, relativePath);
  let before;
  let handle;
  try {
    before = await lstat(absolutePath, { bigint: true });
    handle = await open(
      absolutePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile()) {
      throw new ReleaseManifestError("OFF-REL-NOT-FILE", relativePath);
    }
    if (!sameFileState(before, opened)) {
      throw new ReleaseManifestError("OFF-REL-MUTATED", relativePath);
    }
    if (opened.size > BigInt(maxBytes)) {
      throw new ReleaseManifestError("OFF-REL-LIMIT", relativePath);
    }

    let total = 0;
    const stream = handle.createReadStream({
      autoClose: false,
      highWaterMark: 64 * 1024,
    });
    for await (const chunk of stream) {
      total += chunk.length;
      if (total > maxBytes) {
        throw new ReleaseManifestError("OFF-REL-LIMIT", relativePath);
      }
      if (budget !== undefined) {
        budget.consumed += chunk.length;
        if (budget.consumed > budget.limit) {
          throw new ReleaseManifestError("OFF-REL-LIMIT", relativePath);
        }
      }
      consume(chunk);
    }
    const after = await handle.stat({ bigint: true });
    if (!sameFileState(opened, after)) {
      throw new ReleaseManifestError("OFF-REL-MUTATED", relativePath);
    }
    let finalPathState;
    try {
      finalPathState = await lstat(absolutePath, { bigint: true });
    } catch (error) {
      const code = isPlainObject(error) && typeof error.code === "string"
        ? error.code
        : undefined;
      if (code === "ENOENT" || code === "ENOTDIR") {
        throw new ReleaseManifestError("OFF-REL-MUTATED", relativePath);
      }
      throw new ReleaseManifestError("OFF-REL-IO", relativePath);
    }
    if (!sameFileState(opened, finalPathState)) {
      throw new ReleaseManifestError("OFF-REL-MUTATED", relativePath);
    }
  } catch (error) {
    if (error instanceof ReleaseManifestError) throw error;
    throw fileSystemError(error, relativePath);
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export async function readReleaseFile(
  repositoryRoot,
  relativePath,
  maxBytes = RELEASE_LIMITS.metadataBytes,
) {
  const chunks = [];
  let total = 0;
  await consumeReleaseFile(
    repositoryRoot,
    relativePath,
    maxBytes,
    (chunk) => {
      const copy = Buffer.from(chunk);
      chunks.push(copy);
      total += copy.length;
    },
  );
  return Buffer.concat(chunks, total);
}

export async function sha256ReleaseFile(repositoryRoot, relativePath, budget) {
  const hash = createHash("sha256");
  await consumeReleaseFile(
    repositoryRoot,
    relativePath,
    RELEASE_LIMITS.releaseFileBytes,
    (chunk) => hash.update(chunk),
    budget,
  );
  return hash.digest("hex");
}

export async function createChecksumDocument(repositoryRoot, allowlist) {
  const files = {};
  const budget = {
    consumed: 0,
    limit: RELEASE_LIMITS.totalReleaseBytes,
  };
  for (const path of allowlist.files) {
    if (!allowlist.checksumExclusions.includes(path)) {
      files[path] = await sha256ReleaseFile(repositoryRoot, path, budget);
    }
  }
  return {
    algorithm: "sha256",
    authentication: {
      publicVcsCommit: "pending",
      checksumManifestSha256: "pending",
    },
    candidate: allowlist.candidate,
    files,
    formatVersion: "0.1",
    purpose: "drift-detection-only",
  };
}

function parseArguments(args) {
  if (args.length === 0) return defaultRepositoryRoot;
  if (args.length === 2 && args[0] === "--root" && args[1].length > 0) {
    return resolve(args[1]);
  }
  throw new Error("Usage: node scripts/checksums.mjs [--root <immutable-checkout>]");
}

async function run() {
  try {
    const repositoryRoot = parseArguments(process.argv.slice(2));
    const allowlist = await readAllowlist(repositoryRoot);
    const document = await createChecksumDocument(repositoryRoot, allowlist);
    process.stdout.write(JSON.stringify(document, null, 2) + "\n");
  } catch (error) {
    const code = error instanceof ReleaseManifestError
      ? error.code
      : "OFF-REL-CHECKSUM-FAILURE";
    process.stderr.write(JSON.stringify({ code }) + "\n");
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) await run();
