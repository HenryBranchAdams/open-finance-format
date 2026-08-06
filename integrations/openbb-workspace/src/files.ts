import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";

import { resourceOpaqueId } from "./catalog.ts";
import { RequestError } from "./evaluate.ts";
import type { EvaluationState } from "./types.ts";

const MAX_VIEWER_BYTES = 8 * 1024 * 1024;
const MAX_VIEWER_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024;
const SAFE_INLINE_TYPES = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

interface VerifiedFile {
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly mediaType: string;
  readonly inline: boolean;
}

function records(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    : [];
}

function contained(root: string, candidate: string): boolean {
  const value = relative(root, candidate);
  return value !== "" && value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value);
}

function validRelativePath(value: string): boolean {
  return !isAbsolute(value) && !value.includes("\\") && !value.includes("%") &&
    value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function sameIdentity(left: Awaited<ReturnType<typeof lstat>>, right: Awaited<ReturnType<typeof lstat>>): boolean {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size &&
    left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}

function dataType(mediaType: string): string {
  const known: Record<string, string> = {
    "text/plain": "txt",
    "text/csv": "csv",
    "text/markdown": "md",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return known[mediaType] ?? "bin";
}

export async function verifiedFile(
  state: EvaluationState,
  fileId: string,
  maxBytes = MAX_DOWNLOAD_BYTES,
): Promise<VerifiedFile> {
  if (state.result.kind !== "packageResult") {
    throw new RequestError(409, "evaluation_degraded", "No evaluator-verified local resources are available");
  }
  const resources = records(state.result.normalized.resourceInventory);
  const resource = resources.find((item) =>
    typeof item.id === "string" && resourceOpaqueId(state.record.id, item.id) === fileId
  );
  if (resource === undefined) throw new RequestError(404, "file_not_found", "The opaque file ID is unavailable for this package");
  const location = records(resource.locations).find((item) =>
    item.kind === "local" && item.availability === "available" && item.integrity === "verified"
  );
  if (location === undefined || typeof location.path !== "string" || !validRelativePath(location.path)) {
    throw new RequestError(409, "file_not_verified", "The resource has no evaluator-verified local file");
  }
  if (typeof resource.byteSize !== "number" || resource.byteSize < 0 || resource.byteSize > maxBytes) {
    throw new RequestError(413, "file_too_large", "The verified resource exceeds this endpoint's byte limit");
  }
  if (typeof resource.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(resource.sha256)) {
    throw new RequestError(409, "file_not_verified", "The resource lacks a verified digest");
  }

  const rootBefore = await lstat(state.record.packageRoot);
  if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink()) {
    throw new RequestError(409, "package_identity_changed", "The package directory identity changed after discovery");
  }
  const realRoot = await realpath(state.record.packageRoot);
  if (realRoot !== state.record.packageRoot) {
    throw new RequestError(409, "package_identity_changed", "The package directory identity changed after discovery");
  }
  const candidate = resolve(realRoot, location.path);
  if (!contained(realRoot, candidate)) throw new RequestError(403, "file_boundary_violation", "The resource escaped the selected package");
  let cursor = realRoot;
  for (const segment of location.path.split("/")) {
    cursor = resolve(cursor, segment);
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink()) throw new RequestError(403, "file_boundary_violation", "Symlinked resources are not served");
  }
  if (!contained(realRoot, await realpath(candidate))) throw new RequestError(403, "file_boundary_violation", "The resource escaped the selected package");

  const handle = await open(candidate, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size !== resource.byteSize) {
      throw new RequestError(409, "file_identity_changed", "The resource identity changed after evaluation");
    }
    const bytes = new Uint8Array(before.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, Math.min(64 * 1024, bytes.length - offset), offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat();
    const pathAfter = await lstat(candidate);
    const rootAfter = await lstat(realRoot);
    if (offset !== bytes.length || !sameIdentity(before, after) || !sameIdentity(before, pathAfter) || !sameIdentity(rootBefore, rootAfter)) {
      throw new RequestError(409, "file_identity_changed", "The resource identity changed while it was read");
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== resource.sha256) throw new RequestError(409, "file_digest_changed", "The resource digest changed after evaluation");
    const mediaType = typeof resource.mediaType === "string" ? resource.mediaType : "application/octet-stream";
    return {
      bytes,
      filename: basename(location.path).replaceAll(/[\r\n"\\]/gu, "_"),
      mediaType,
      inline: SAFE_INLINE_TYPES.has(mediaType),
    };
  } finally {
    await handle.close();
  }
}

export async function viewerFiles(state: EvaluationState, fileIds: readonly string[]): Promise<Record<string, unknown>[]> {
  const output: Record<string, unknown>[] = [];
  let totalBytes = 0;
  for (const fileId of fileIds) {
    try {
      const remainingBytes = Math.min(MAX_VIEWER_BYTES, MAX_VIEWER_TOTAL_BYTES - totalBytes);
      const file = await verifiedFile(state, fileId, remainingBytes);
      totalBytes += file.bytes.byteLength;
      if (!file.inline) {
        output.push({ error_type: "unsafe_inline_format", content: "This verified file is download-only and is not rendered inline." });
      } else {
        output.push({
          content: Buffer.from(file.bytes).toString("base64"),
          data_format: { data_type: dataType(file.mediaType), filename: file.filename },
        });
      }
    } catch (error) {
      output.push({
        error_type: error instanceof RequestError ? error.code : "file_unavailable",
        content: error instanceof RequestError ? error.message : "The verified file could not be read safely.",
      });
    }
  }
  return output;
}

export function sanitizeMarkdown(value: string): string {
  return value
    .replaceAll(/<[^>]*>/gu, "")
    .replaceAll(/\]\(\s*(?:javascript|data|vbscript):/giu, "](blocked:")
    .replaceAll(/\0/gu, "")
    .slice(0, 2 * 1024 * 1024);
}
