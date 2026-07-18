import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  lstat as nodeLstat,
  open as nodeOpen,
  opendir as nodeOpendir,
  readdir as nodeReaddir,
  realpath as nodeRealpath,
} from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  createDiagnostic,
  finalizeDiagnostics,
  type Diagnostic,
} from "./diagnostics.ts";

export type LocalPathFailureReason =
  | "emptyPath"
  | "absolutePath"
  | "uncPrefix"
  | "drivePrefix"
  | "backslash"
  | "percent"
  | "query"
  | "fragment"
  | "nonPrintableAscii"
  | "emptySegment"
  | "dotSegment"
  | "parentSegment"
  | "trailingDot"
  | "trailingSpace"
  | "deviceName"
  | "duplicatePath"
  | "caseCollision";

export interface LocalResourceInput {
  readonly resourceId: string;
  readonly resourceIndex: number;
  readonly locationIndex: number;
  readonly path: string;
  readonly byteSize: number;
  readonly sha256: string;
}

export interface VerifiedLocalResource {
  readonly resourceId: string;
  readonly path: string;
  readonly byteSize: number;
  readonly sha256: string;
}

export interface ResourceLimits {
  readonly maxResourceBytes: number;
  readonly maxTotalBytes: number;
  readonly maxPathBytes: number;
  readonly maxPathSegments: number;
  readonly maxDirectoryEntries: number;
  readonly chunkBytes: number;
}

const MAX_CHUNK_ALLOCATION_BYTES = 16 * 1024 * 1024;

export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxResourceBytes: 256 * 1024 * 1024,
  maxTotalBytes: 1024 * 1024 * 1024,
  maxPathBytes: 4096,
  maxPathSegments: 128,
  maxDirectoryEntries: 100_000,
  chunkBytes: 64 * 1024,
};

export interface ResourceStat {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface OpenedResource {
  stat(): Promise<ResourceStat>;
  read(buffer: Uint8Array): Promise<number>;
  close(): Promise<void>;
}

export interface DirectoryScan {
  readonly names: readonly string[];
  readonly exceeded: boolean;
}

export interface ResourceFileSystem {
  realpath(path: string): Promise<string>;
  readdir(path: string): Promise<readonly string[]>;
  scanDirectory?(path: string, maxEntries: number): Promise<DirectoryScan>;
  lstat(path: string): Promise<ResourceStat>;
  open(path: string, flags: number): Promise<OpenedResource>;
}

export type EvaluatorFailureCode = "OFF-T1001" | "OFF-T1002" | "OFF-T1003" | "OFF-T1004";

export interface EvaluatorFailure {
  readonly kind: "evaluatorFailure";
  readonly code: EvaluatorFailureCode;
  readonly operation:
    | "resourceLimit"
    | "rootAccess"
    | "directoryRead"
    | "resourceStat"
    | "resourceOpen"
    | "resourceRead"
    | "resourceClose"
    | "resourceMutation"
    | "configuration"
    | "internal";
  readonly resourceId?: string;
  readonly path?: string;
}

export interface ResolvedResources {
  readonly kind: "resolved";
  readonly verified: readonly VerifiedLocalResource[];
  readonly diagnostics: readonly Diagnostic[];
}

export type ResourceResolution = ResolvedResources | EvaluatorFailure;

export interface ResolveResourceOptions {
  readonly limits?: Partial<ResourceLimits>;
  readonly fileSystem?: ResourceFileSystem;
}

const WINDOWS_DEVICE_NAME = /^(?:CON|PRN|AUX|NUL|CLOCK\$|CONIN\$|CONOUT\$|COM[1-9]|LPT[1-9])$/iu;

function asciiCaseFold(value: string): string {
  return value.replace(/[A-Z]/gu, (character) => character.toLowerCase());
}

function safePathRendering(path: string): string {
  let rendered = "";
  for (const character of path) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= 0x20 && codePoint <= 0x7e && character !== "\\") {
      rendered += character;
    } else if (character === "\\") {
      rendered += "\\\\";
    } else {
      rendered += `\\u{${codePoint.toString(16).toUpperCase()}}`;
    }
  }
  return rendered;
}

export function validateLocalPath(path: string): LocalPathFailureReason | null {
  if (path.length === 0) return "emptyPath";
  if (path.startsWith("//")) return "uncPrefix";
  if (path.startsWith("/")) return "absolutePath";
  if (/^[A-Za-z]:/u.test(path)) return "drivePrefix";
  if (path.includes("\\")) return "backslash";
  if (path.includes("%")) return "percent";
  if (path.includes("?")) return "query";
  if (path.includes("#")) return "fragment";
  if ([...path].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 0x20 || code > 0x7e;
  })) return "nonPrintableAscii";

  for (const segment of path.split("/")) {
    if (segment.length === 0) return "emptySegment";
    if (segment === ".") return "dotSegment";
    if (segment === "..") return "parentSegment";
    if (segment.endsWith(".")) return "trailingDot";
    if (segment.endsWith(" ")) return "trailingSpace";
    if (WINDOWS_DEVICE_NAME.test(segment.split(".", 1)[0] ?? segment)) {
      return "deviceName";
    }
  }
  return null;
}

export const NODE_RESOURCE_FILE_SYSTEM: ResourceFileSystem = {
  realpath: nodeRealpath,
  readdir: (path) => nodeReaddir(path),
  async scanDirectory(path, maxEntries) {
    const directory = await nodeOpendir(path);
    const names: string[] = [];
    try {
      while (true) {
        const entry = await directory.read();
        if (entry === null) return { names, exceeded: false };
        if (names.length === maxEntries) return { names, exceeded: true };
        names.push(entry.name);
      }
    } finally {
      await directory.close();
    }
  },
  lstat: (path) => nodeLstat(path, { bigint: true }),
  async open(path, flags) {
    const handle = await nodeOpen(path, flags);
    return {
      stat: () => handle.stat({ bigint: true }),
      async read(buffer) {
        const { bytesRead } = await handle.read(
          buffer,
          0,
          buffer.byteLength,
          null,
        );
        return bytesRead;
      },
      close: () => handle.close(),
    };
  },
};

function resourceFailure(
  code: EvaluatorFailureCode,
  operation: EvaluatorFailure["operation"],
  input?: LocalResourceInput,
): EvaluatorFailure {
  return {
    kind: "evaluatorFailure",
    code,
    operation,
    ...(input === undefined
      ? {}
      : {
          resourceId: input.resourceId,
          path: safePathRendering(input.path),
        }),
  };
}

function errno(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function failureAfterPrecheck(
  error: unknown,
  input: LocalResourceInput,
  hostOperation: EvaluatorFailure["operation"] = "resourceStat",
): EvaluatorFailure {
  return ["ENOENT", "ENOTDIR", "ELOOP"].includes(errno(error) ?? "")
    ? resourceFailure("OFF-T1003", "resourceMutation", input)
    : resourceFailure("OFF-T1002", hostOperation, input);
}

function fileDiagnostic(
  input: LocalResourceInput,
  reason: string,
): Diagnostic {
  return createDiagnostic(
    "OFF.CORE.RESOURCE_FILE",
    `/resources/${input.resourceIndex}/locations/${input.locationIndex}/path`,
    { path: safePathRendering(input.path), reason },
    input.resourceId,
  );
}

function pathDiagnostic(
  input: LocalResourceInput,
  reason: LocalPathFailureReason,
): Diagnostic {
  return createDiagnostic(
    "OFF.CORE.RESOURCE_PATH",
    `/resources/${input.resourceIndex}/locations/${input.locationIndex}/path`,
    { path: safePathRendering(input.path), reason },
    input.resourceId,
  );
}

function isContained(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return fromRoot !== "" && !isAbsolute(fromRoot) && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`);
}

function sameIdentity(left: ResourceStat, right: ResourceStat): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

interface ResolutionBudget {
  bytesRead: bigint;
  directoryEntries: number;
  readonly directoryCache: Map<string, DirectoryInventory>;
}

interface DirectoryInventory {
  readonly identity: ResourceStat;
  readonly names: ReadonlySet<string>;
  readonly foldedNames: ReadonlySet<string>;
}

interface CheckedDirectory {
  readonly path: string;
  readonly identity: ResourceStat;
}

type OneResolution =
  | { readonly kind: "verified"; readonly value: VerifiedLocalResource }
  | { readonly kind: "invalid"; readonly diagnostics: readonly Diagnostic[] }
  | EvaluatorFailure;

async function directoryInventory(
  path: string,
  expectedIdentity: ResourceStat,
  input: LocalResourceInput,
  limits: ResourceLimits,
  fileSystem: ResourceFileSystem,
  budget: ResolutionBudget,
): Promise<DirectoryInventory | EvaluatorFailure> {
  let before: ResourceStat;
  try {
    before = await fileSystem.lstat(path);
  } catch (error) {
    return failureAfterPrecheck(error, input, "directoryRead");
  }
  if (!before.isDirectory() || !sameIdentity(expectedIdentity, before)) {
    return resourceFailure("OFF-T1003", "resourceMutation", input);
  }

  const cached = budget.directoryCache.get(path);
  if (cached !== undefined) {
    return sameIdentity(cached.identity, before)
      ? cached
      : resourceFailure("OFF-T1003", "resourceMutation", input);
  }

  const remainingEntries = limits.maxDirectoryEntries - budget.directoryEntries;
  let scan: DirectoryScan;
  try {
    if (fileSystem.scanDirectory === undefined) {
      const names = await fileSystem.readdir(path);
      scan = names.length > remainingEntries
        ? { names: names.slice(0, remainingEntries), exceeded: true }
        : { names, exceeded: false };
    } else {
      scan = await fileSystem.scanDirectory(path, remainingEntries);
    }
  } catch (error) {
    return failureAfterPrecheck(error, input, "directoryRead");
  }
  if (scan.names.length > remainingEntries) {
    return resourceFailure("OFF-T1004", "internal", input);
  }

  let after: ResourceStat;
  try {
    after = await fileSystem.lstat(path);
  } catch (error) {
    return failureAfterPrecheck(error, input, "directoryRead");
  }
  if (!after.isDirectory() || !sameIdentity(before, after)) {
    return resourceFailure("OFF-T1003", "resourceMutation", input);
  }
  if (scan.exceeded) {
    return resourceFailure("OFF-T1001", "resourceLimit", input);
  }

  budget.directoryEntries += scan.names.length;
  const names = new Set(scan.names);
  const inventory: DirectoryInventory = {
    identity: after,
    names,
    foldedNames: new Set([...names].map(asciiCaseFold)),
  };
  budget.directoryCache.set(path, inventory);
  return inventory;
}

async function verifyPathIdentities(
  directories: readonly CheckedDirectory[],
  candidate: string,
  finalIdentity: ResourceStat,
  input: LocalResourceInput,
  fileSystem: ResourceFileSystem,
): Promise<EvaluatorFailure | undefined> {
  for (const directory of directories) {
    let current: ResourceStat;
    try {
      current = await fileSystem.lstat(directory.path);
    } catch (error) {
      return failureAfterPrecheck(error, input);
    }
    if (!current.isDirectory() || !sameIdentity(directory.identity, current)) {
      return resourceFailure("OFF-T1003", "resourceMutation", input);
    }
  }

  let currentFinal: ResourceStat;
  try {
    currentFinal = await fileSystem.lstat(candidate);
  } catch (error) {
    return failureAfterPrecheck(error, input);
  }
  return currentFinal.isFile() && sameIdentity(finalIdentity, currentFinal)
    ? undefined
    : resourceFailure("OFF-T1003", "resourceMutation", input);
}

async function resolveOne(
  root: string,
  rootIdentity: ResourceStat,
  input: LocalResourceInput,
  limits: ResourceLimits,
  fileSystem: ResourceFileSystem,
  budget: ResolutionBudget,
): Promise<OneResolution> {
  const segments = input.path.split("/");
  const candidate = resolve(root, ...segments);
  if (!isContained(root, candidate)) {
    return { kind: "invalid", diagnostics: [fileDiagnostic(input, "outsideRoot")] };
  }

  let parent = root;
  let parentIdentity = rootIdentity;
  let finalIdentity: ResourceStat | undefined;
  const checkedDirectories: CheckedDirectory[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined) {
      return resourceFailure("OFF-T1004", "internal", input);
    }
    const inventory = await directoryInventory(
      parent,
      parentIdentity,
      input,
      limits,
      fileSystem,
      budget,
    );
    if ("kind" in inventory) return inventory;
    checkedDirectories.push({ path: parent, identity: inventory.identity });
    if (!inventory.names.has(segment)) {
      const caseMismatch = inventory.foldedNames.has(asciiCaseFold(segment));
      return {
        kind: "invalid",
        diagnostics: [fileDiagnostic(input, caseMismatch ? "caseMismatch" : "missing")],
      };
    }
    const entry = resolve(parent, segment);
    let stat: ResourceStat;
    try {
      stat = await fileSystem.lstat(entry);
    } catch (error) {
      return failureAfterPrecheck(error, input);
    }
    if (stat.isSymbolicLink()) {
      return { kind: "invalid", diagnostics: [fileDiagnostic(input, "symlink")] };
    }
    const final = index === segments.length - 1;
    if (!final && !stat.isDirectory()) {
      return { kind: "invalid", diagnostics: [fileDiagnostic(input, "nonDirectorySegment")] };
    }
    if (final && !stat.isFile()) {
      return { kind: "invalid", diagnostics: [fileDiagnostic(input, "nonRegularFile")] };
    }
    let parentAfter: ResourceStat;
    try {
      parentAfter = await fileSystem.lstat(parent);
    } catch (error) {
      return failureAfterPrecheck(error, input);
    }
    if (!parentAfter.isDirectory() || !sameIdentity(inventory.identity, parentAfter)) {
      return resourceFailure("OFF-T1003", "resourceMutation", input);
    }
    if (final) {
      finalIdentity = stat;
    } else {
      parent = entry;
      parentIdentity = stat;
    }
  }
  if (finalIdentity === undefined) {
    return resourceFailure("OFF-T1004", "internal", input);
  }

  let canonicalCandidate: string;
  try {
    canonicalCandidate = await fileSystem.realpath(candidate);
  } catch (error) {
    return failureAfterPrecheck(error, input);
  }
  if (!isContained(root, canonicalCandidate)) {
    return resourceFailure("OFF-T1003", "resourceMutation", input);
  }
  const beforeOpen = await verifyPathIdentities(
    checkedDirectories,
    candidate,
    finalIdentity,
    input,
    fileSystem,
  );
  if (beforeOpen !== undefined) return beforeOpen;

  const noFollow = "O_NOFOLLOW" in fsConstants ? fsConstants.O_NOFOLLOW : 0;
  let handle: OpenedResource;
  try {
    handle = await fileSystem.open(candidate, fsConstants.O_RDONLY | noFollow);
  } catch (error) {
    return failureAfterPrecheck(error, input, "resourceOpen");
  }

  let resolution: OneResolution;
  try {
    const pre = await handle.stat();
    if (!pre.isFile() || !sameIdentity(finalIdentity, pre)) {
      resolution = resourceFailure("OFF-T1003", "resourceMutation", input);
    } else {
      const beforeRead = await verifyPathIdentities(
        checkedDirectories,
        candidate,
        finalIdentity,
        input,
        fileSystem,
      );
      if (beforeRead !== undefined) {
        resolution = beforeRead;
      } else if (
        pre.size > BigInt(limits.maxResourceBytes) ||
        budget.bytesRead + pre.size > BigInt(limits.maxTotalBytes)
      ) {
        resolution = resourceFailure("OFF-T1001", "resourceLimit", input);
      } else {
        const hash = createHash("sha256");
        const bufferLength = Math.max(
          1,
          Math.min(limits.chunkBytes, Number(pre.size)),
        );
        const buffer = new Uint8Array(bufferLength);
        let actualBytes = 0n;
        let readFailure: EvaluatorFailure | undefined;
        while (true) {
          let bytesRead: number;
          try {
            bytesRead = await handle.read(buffer);
          } catch {
            readFailure = resourceFailure("OFF-T1002", "resourceRead", input);
            break;
          }
          if (!Number.isInteger(bytesRead) || bytesRead < 0 || bytesRead > buffer.byteLength) {
            readFailure = resourceFailure("OFF-T1004", "internal", input);
            break;
          }
          if (bytesRead === 0) break;
          actualBytes += BigInt(bytesRead);
          budget.bytesRead += BigInt(bytesRead);
          if (actualBytes > pre.size) {
            readFailure = resourceFailure("OFF-T1003", "resourceMutation", input);
            break;
          }
          if (
            actualBytes > BigInt(limits.maxResourceBytes) ||
            budget.bytesRead > BigInt(limits.maxTotalBytes)
          ) {
            readFailure = resourceFailure("OFF-T1001", "resourceLimit", input);
            break;
          }
          hash.update(buffer.subarray(0, bytesRead));
        }

        if (readFailure !== undefined) {
          resolution = readFailure;
        } else {
          let post: ResourceStat;
          try {
            post = await handle.stat();
          } catch {
            post = pre;
            readFailure = resourceFailure("OFF-T1002", "resourceStat", input);
          }
          if (readFailure !== undefined) {
            resolution = readFailure;
          } else if (actualBytes !== pre.size || !sameIdentity(pre, post)) {
            resolution = resourceFailure("OFF-T1003", "resourceMutation", input);
          } else {
            const afterRead = await verifyPathIdentities(
              checkedDirectories,
              candidate,
              finalIdentity,
              input,
              fileSystem,
            );
            if (afterRead !== undefined) {
              resolution = afterRead;
            } else {
              const actualByteSize = Number(actualBytes);
              const actualSha256 = hash.digest("hex");
              const diagnostics: Diagnostic[] = [];
              if (actualByteSize !== input.byteSize) {
                diagnostics.push(
                  createDiagnostic(
                    "OFF.CORE.RESOURCE_SIZE",
                    `/resources/${input.resourceIndex}/byteSize`,
                    { actualByteSize, declaredByteSize: input.byteSize },
                    input.resourceId,
                  ),
                );
              }
              if (actualSha256 !== input.sha256) {
                diagnostics.push(
                  createDiagnostic(
                    "OFF.CORE.RESOURCE_DIGEST",
                    `/resources/${input.resourceIndex}/sha256`,
                    { actualSha256, declaredSha256: input.sha256 },
                    input.resourceId,
                  ),
                );
              }
              resolution = diagnostics.length === 0
                ? {
                    kind: "verified",
                    value: {
                      resourceId: input.resourceId,
                      path: input.path,
                      byteSize: actualByteSize,
                      sha256: actualSha256,
                    },
                  }
                : { kind: "invalid", diagnostics };
            }
          }
        }
      }
    }
  } catch {
    resolution = resourceFailure("OFF-T1002", "resourceStat", input);
  }

  try {
    await handle.close();
  } catch {
    if (resolution.kind !== "evaluatorFailure") {
      return resourceFailure("OFF-T1002", "resourceClose", input);
    }
  }
  return resolution;
}

function completeLimits(partial: Partial<ResourceLimits> | undefined): ResourceLimits | null {
  const limits = { ...DEFAULT_RESOURCE_LIMITS, ...partial };
  return Object.values(limits).every(
    (value) => Number.isSafeInteger(value) && value > 0,
  ) && limits.chunkBytes <= MAX_CHUNK_ALLOCATION_BYTES
    ? limits
    : null;
}

export async function resolveLocalResources(
  packageRoot: string,
  inputs: readonly LocalResourceInput[],
  options: ResolveResourceOptions = {},
): Promise<ResourceResolution> {
  const limits = completeLimits(options.limits);
  if (limits === null) return resourceFailure("OFF-T1004", "internal");

  const diagnostics: Diagnostic[] = [];
  const unsafe = new Map<number, LocalPathFailureReason>();
  inputs.forEach((input, index) => {
    const reason = validateLocalPath(input.path);
    if (reason !== null) unsafe.set(index, reason);
  });

  const overPathLimit = inputs.find(
    (input, index) =>
      !unsafe.has(index) &&
      (Buffer.byteLength(input.path, "ascii") > limits.maxPathBytes ||
        input.path.split("/").length > limits.maxPathSegments),
  );
  if (overPathLimit !== undefined) {
    return resourceFailure("OFF-T1001", "resourceLimit", overPathLimit);
  }

  const groups = new Map<string, number[]>();
  inputs.forEach((input, index) => {
    if (unsafe.has(index)) return;
    const folded = asciiCaseFold(input.path);
    const group = groups.get(folded) ?? [];
    group.push(index);
    groups.set(folded, group);
  });
  for (const indexes of groups.values()) {
    if (indexes.length < 2) continue;
    const paths = indexes.map((index) => inputs[index]?.path ?? "");
    const reason: LocalPathFailureReason = new Set(paths).size === 1
      ? "duplicatePath"
      : "caseCollision";
    indexes.forEach((index) => unsafe.set(index, reason));
  }

  for (const [index, reason] of unsafe) {
    const input = inputs[index];
    if (input !== undefined) diagnostics.push(pathDiagnostic(input, reason));
  }
  const candidates = inputs.filter((_, index) => !unsafe.has(index));
  if (candidates.length === 0) {
    return { kind: "resolved", verified: [], diagnostics: finalizeDiagnostics(diagnostics) };
  }

  const fileSystem = options.fileSystem ?? NODE_RESOURCE_FILE_SYSTEM;
  let root: string;
  let rootIdentity: ResourceStat;
  try {
    root = await fileSystem.realpath(packageRoot);
    rootIdentity = await fileSystem.lstat(root);
    if (!rootIdentity.isDirectory()) return resourceFailure("OFF-T1002", "rootAccess");
  } catch {
    return resourceFailure("OFF-T1002", "rootAccess");
  }

  const verified: VerifiedLocalResource[] = [];
  const budget: ResolutionBudget = {
    bytesRead: 0n,
    directoryEntries: 0,
    directoryCache: new Map(),
  };
  for (const input of candidates) {
    const resolution = await resolveOne(
      root,
      rootIdentity,
      input,
      limits,
      fileSystem,
      budget,
    );
    if (resolution.kind === "evaluatorFailure") return resolution;
    if (resolution.kind === "verified") verified.push(resolution.value);
    else diagnostics.push(...resolution.diagnostics);
  }
  return {
    kind: "resolved",
    verified,
    diagnostics: finalizeDiagnostics(diagnostics),
  };
}
