import { createHash } from "node:crypto";
import type { BigIntStats } from "node:fs";
import { lstat, mkdir, open, rmdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";

import { evaluatePackage } from "./index.ts";
import { canonicalizeJson } from "./json/jcs.ts";
import { isWholeSecondUtcTimestamp } from "./schema.ts";
import { isAbsoluteUri, isHttpsUrlWithoutUserInfo } from "./uri.ts";

export interface InitializeCoreOptions {
  readonly target: string;
  readonly packageId: string;
  readonly releaseId: string;
  readonly entrypointId: string;
  readonly releaseVersion: string;
  readonly title: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly license: string;
  readonly publishedAt: string;
  readonly canonicalUrl: string;
}

export interface InitializeCoreResult {
  readonly kind: "initializedCorePackage";
  readonly files: readonly ["OFF.md", "off.json"];
  readonly manifestBytes: Uint8Array;
  readonly narrativeBytes: Uint8Array;
}

/** @internal Test seam; not exported from the package entrypoint. */
export interface InitializeCoreOperations {
  readonly makeDirectory: (path: string) => Promise<void>;
}

export type InitializationFailureReason =
  | "invalidArguments"
  | "targetExists"
  | "targetUnavailable"
  | "writeFailed"
  | "selfValidationFailed";

export class InitializationError extends Error {
  readonly code: "OFF-I1001" | "OFF-I1002";
  readonly reason: InitializationFailureReason;

  constructor(
    code: "OFF-I1001" | "OFF-I1002",
    reason: InitializationFailureReason,
  ) {
    super(`${code}:${reason}`);
    this.name = "InitializationError";
    this.code = code;
    this.reason = reason;
  }
}

function portableSingleLineText(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit <= 0x1f || unit === 0x7f) return false;
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function validOptions(value: InitializeCoreOptions): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    portableSingleLineText(value.target) &&
    isAbsoluteUri(value.packageId) &&
    isAbsoluteUri(value.releaseId) &&
    isAbsoluteUri(value.entrypointId) &&
    portableSingleLineText(value.releaseVersion) &&
    portableSingleLineText(value.title) &&
    isAbsoluteUri(value.authorId) &&
    portableSingleLineText(value.authorName) &&
    portableSingleLineText(value.license) &&
    isWholeSecondUtcTimestamp(value.publishedAt) &&
    isHttpsUrlWithoutUserInfo(value.canonicalUrl)
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

interface OwnedFile {
  readonly path: string;
  readonly identity: BigIntStats;
}

async function writeExclusive(
  path: string,
  bytes: Uint8Array,
): Promise<BigIntStats> {
  const handle = await open(path, "wx", 0o644);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
    return await handle.stat({ bigint: true });
  } finally {
    await handle.close();
  }
}

async function targetExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw new InitializationError("OFF-I1002", "targetUnavailable");
  }
}

function isMissingPath(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT";
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function sameObject(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameUnchangedFile(left: BigIntStats, right: BigIntStats): boolean {
  return sameObject(left, right) &&
    left.isFile() &&
    right.isFile() &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

async function removeInitializedFiles(
  packageRoot: string,
  directoryIdentity: BigIntStats,
  ownedFiles: readonly OwnedFile[],
): Promise<void> {
  let failed = false;
  let currentDirectory: BigIntStats;
  try {
    currentDirectory = await lstat(packageRoot, { bigint: true });
  } catch (error) {
    if (isMissingPath(error)) return;
    throw new InitializationError("OFF-I1002", "writeFailed");
  }
  if (
    !sameObject(directoryIdentity, currentDirectory) ||
    !currentDirectory.isDirectory() ||
    currentDirectory.isSymbolicLink()
  ) {
    return;
  }

  for (const owned of [...ownedFiles].reverse()) {
    let current: BigIntStats;
    try {
      current = await lstat(owned.path, { bigint: true });
    } catch (error) {
      if (isMissingPath(error)) continue;
      failed = true;
      continue;
    }
    if (!sameUnchangedFile(owned.identity, current)) continue;
    try {
      await unlink(owned.path);
    } catch (error) {
      if (!isMissingPath(error)) failed = true;
    }
  }

  try {
    const after = await lstat(packageRoot, { bigint: true });
    if (sameObject(directoryIdentity, after) && after.isDirectory()) {
      await rmdir(packageRoot);
    }
  } catch (error) {
    if (
      !isMissingPath(error) &&
      errorCode(error) !== "ENOTEMPTY" &&
      errorCode(error) !== "EEXIST"
    ) {
      failed = true;
    }
  }
  if (failed) {
    throw new InitializationError("OFF-I1002", "writeFailed");
  }
}

/** @internal Test seam; not exported from the package entrypoint. */
export async function initializeCorePackageWithOperations(
  options: InitializeCoreOptions,
  operations: InitializeCoreOperations,
): Promise<InitializeCoreResult> {
  if (!validOptions(options)) {
    throw new InitializationError("OFF-I1001", "invalidArguments");
  }

  const packageRoot = resolve(options.target);
  if (await targetExists(packageRoot)) {
    throw new InitializationError("OFF-I1001", "targetExists");
  }

  const narrativeBytes = new TextEncoder().encode(
    `# ${options.title}\n\nThis is an Open Finance Format Core package.\n`,
  );
  const narrativeSha256 = sha256(narrativeBytes);
  const manifest = {
    offVersion: "0.1",
    package: {
      id: options.packageId,
      releaseId: options.releaseId,
      releaseVersion: options.releaseVersion,
      title: options.title,
      authors: [{ id: options.authorId, name: options.authorName }],
      license: { id: options.license },
      publishedAt: options.publishedAt,
      canonicalUrl: options.canonicalUrl,
      entrypointResourceId: options.entrypointId,
    },
    profiles: [],
    resources: [
      {
        id: options.entrypointId,
        mediaType: "text/markdown",
        roles: ["entrypoint", "narrative"],
        locations: [{ kind: "local", path: "OFF.md" }],
        byteSize: narrativeBytes.byteLength,
        sha256: narrativeSha256,
      },
    ],
  } as const;
  const canonicalManifest = canonicalizeJson(manifest);
  const manifestBytes = new Uint8Array(canonicalManifest.byteLength + 1);
  manifestBytes.set(canonicalManifest);
  manifestBytes[canonicalManifest.byteLength] = 0x0a;

  let directoryIdentity: BigIntStats | undefined;
  const ownedFiles: OwnedFile[] = [];
  try {
    try {
      await operations.makeDirectory(packageRoot);
      directoryIdentity = await lstat(packageRoot, { bigint: true });
      if (
        !directoryIdentity.isDirectory() ||
        directoryIdentity.isSymbolicLink()
      ) {
        throw new InitializationError("OFF-I1002", "targetUnavailable");
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw new InitializationError("OFF-I1001", "targetExists");
      }
      throw new InitializationError("OFF-I1002", "targetUnavailable");
    }

    try {
      const narrativePath = resolve(packageRoot, "OFF.md");
      const narrativeIdentity = await writeExclusive(narrativePath, narrativeBytes);
      ownedFiles.push({ path: narrativePath, identity: narrativeIdentity });
      const manifestPath = resolve(packageRoot, "off.json");
      const manifestIdentity = await writeExclusive(manifestPath, manifestBytes);
      ownedFiles.push({ path: manifestPath, identity: manifestIdentity });
    } catch {
      throw new InitializationError("OFF-I1002", "writeFailed");
    }

    const evaluated = await evaluatePackage({
      packageRoot,
      evaluatedAt: options.publishedAt,
      requestedProfiles: [],
    });
    if (
      evaluated.kind !== "packageResult" ||
      evaluated.normalized.outcome !== "valid"
    ) {
      throw new InitializationError("OFF-I1002", "selfValidationFailed");
    }

    return {
      kind: "initializedCorePackage",
      files: ["OFF.md", "off.json"],
      manifestBytes,
      narrativeBytes,
    };
  } catch (error) {
    if (directoryIdentity !== undefined) {
      await removeInitializedFiles(packageRoot, directoryIdentity, ownedFiles);
    }
    throw error;
  }
}

export async function initializeCorePackage(
  options: InitializeCoreOptions,
): Promise<InitializeCoreResult> {
  return initializeCorePackageWithOperations(options, {
    async makeDirectory(path) {
      await mkdir(path, { mode: 0o755 });
    },
  });
}
