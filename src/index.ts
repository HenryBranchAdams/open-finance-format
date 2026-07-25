import { constants as fsConstants, type BigIntStats } from "node:fs";
import {
  lstat,
  open,
  opendir,
} from "node:fs/promises";
import { join, resolve } from "node:path";

import { evaluateCore } from "./core.ts";
import {
  createDiagnostic,
  type Diagnostic,
} from "./diagnostics.ts";
import { canonicalizeJson } from "./json/jcs.ts";
import { AdmissionLimitError, admitJson } from "./json/parse.ts";
import {
  buildNormalizedResult,
  type NormalizedResource,
  type NormalizedResult,
  type PackageIdentity,
} from "./normalize.ts";
import {
  PUBLIC_EQUITY_PROFILE_URI,
  WORKBOOK_BINDING_PROFILE_URI,
} from "./profiles.ts";
import {
  coreProfileContextFromNormalized,
  evaluatePublicEquity,
} from "./public-equity.ts";
import type { EvaluatorFailure } from "./resources.ts";
import { isAbsoluteUri } from "./uri.ts";
import {
  evaluateWorkbookBinding,
  workbookBindingCoreContextFromNormalized,
} from "./workbook-binding.ts";

export {
  PUBLIC_EQUITY_PROFILE_URI,
  WORKBOOK_BINDING_PROFILE_URI,
} from "./profiles.ts";

export const MAX_MANIFEST_BYTES = 16 * 1024 * 1024;
export const MAX_PACKAGE_ROOT_ENTRIES = 100_000;
const MANIFEST_CHUNK_BYTES = 64 * 1024;

export interface EvaluatePackageOptions {
  readonly packageRoot: string;
  readonly evaluatedAt: string;
  readonly requestedProfiles: readonly string[];
}

export interface PackageResult {
  readonly kind: "packageResult";
  readonly normalized: NormalizedResult;
  readonly canonicalBytes: Uint8Array;
}

export type EvaluationResult = PackageResult | EvaluatorFailure;

type ManifestReadResult =
  | { readonly kind: "manifest"; readonly bytes: Uint8Array }
  | { readonly kind: "missing" }
  | EvaluatorFailure;

function evaluatorFailure(
  code: EvaluatorFailure["code"],
  operation: EvaluatorFailure["operation"],
): EvaluatorFailure {
  return { kind: "evaluatorFailure", code, operation };
}

function isWholeSecondUtcTimestamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u.exec(value);
  if (match === null) return false;
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === date &&
    Number(match[4]) <= 23 &&
    Number(match[5]) <= 59 &&
    Number(match[6]) <= 59;
}

function errno(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function sameIdentity(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

async function readManifest(packageRoot: string): Promise<ManifestReadResult> {
  let rootBefore: BigIntStats;
  try {
    rootBefore = await lstat(packageRoot, { bigint: true });
  } catch {
    return evaluatorFailure("OFF-T1002", "rootAccess");
  }
  if (!rootBefore.isDirectory() || rootBefore.isSymbolicLink()) {
    return evaluatorFailure("OFF-T1002", "rootAccess");
  }

  let foundManifest = false;
  let inventoryFailure: EvaluatorFailure | undefined;
  let rootAfterInventory: BigIntStats;
  let directory: Awaited<ReturnType<typeof opendir>>;
  try {
    directory = await opendir(packageRoot);
  } catch {
    return evaluatorFailure("OFF-T1002", "rootAccess");
  }
  try {
    let count = 0;
    while (true) {
      const entry = await directory.read();
      if (entry === null) break;
      count += 1;
      if (count > MAX_PACKAGE_ROOT_ENTRIES) {
        inventoryFailure = evaluatorFailure("OFF-T1001", "resourceLimit");
        break;
      }
      if (entry.name === "off.json") foundManifest = true;
    }
  } catch {
    inventoryFailure = evaluatorFailure("OFF-T1002", "rootAccess");
  }
  try {
    await directory.close();
  } catch {
    return evaluatorFailure("OFF-T1002", "rootAccess");
  }
  if (inventoryFailure !== undefined) return inventoryFailure;
  try {
    rootAfterInventory = await lstat(packageRoot, { bigint: true });
  } catch {
    return evaluatorFailure("OFF-T1002", "rootAccess");
  }
  if (!sameIdentity(rootBefore, rootAfterInventory)) {
    return evaluatorFailure("OFF-T1003", "resourceMutation");
  }
  if (!foundManifest) {
    return { kind: "missing" };
  }

  const manifestPath = join(packageRoot, "off.json");
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(
      manifestPath,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
    );
  } catch (error) {
    return ["ENOENT", "ENOTDIR"].includes(errno(error) ?? "")
      ? evaluatorFailure("OFF-T1003", "resourceMutation")
      : evaluatorFailure("OFF-T1002", "rootAccess");
  }

  let result: ManifestReadResult;
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) {
      result = evaluatorFailure("OFF-T1002", "rootAccess");
    } else if (before.size > BigInt(MAX_MANIFEST_BYTES)) {
      result = evaluatorFailure("OFF-T1001", "resourceLimit");
    } else {
      const length = Number(before.size);
      const bytes = new Uint8Array(length);
      let offset = 0;
      while (offset < length) {
        const chunkLength = Math.min(MANIFEST_CHUNK_BYTES, length - offset);
        const { bytesRead } = await handle.read(
          bytes,
          offset,
          chunkLength,
          offset,
        );
        if (bytesRead === 0) break;
        offset += bytesRead;
      }
      if (offset !== length) {
        result = evaluatorFailure("OFF-T1003", "resourceMutation");
      } else {
        const after = await handle.stat({ bigint: true });
        let pathAfter: BigIntStats | undefined;
        let rootAfterRead: BigIntStats | undefined;
        let pathFailure: EvaluatorFailure | undefined;
        try {
          pathAfter = await lstat(manifestPath, { bigint: true });
          rootAfterRead = await lstat(packageRoot, { bigint: true });
        } catch (error) {
          pathFailure = ["ENOENT", "ENOTDIR"].includes(errno(error) ?? "")
            ? evaluatorFailure("OFF-T1003", "resourceMutation")
            : evaluatorFailure("OFF-T1002", "rootAccess");
        }
        if (pathFailure !== undefined) {
          result = pathFailure;
        } else if (
          pathAfter !== undefined &&
          rootAfterRead !== undefined &&
          sameIdentity(before, after) &&
          sameIdentity(before, pathAfter) &&
          sameIdentity(rootAfterInventory, rootAfterRead)
        ) {
          result = { kind: "manifest", bytes };
        } else {
          result = evaluatorFailure("OFF-T1003", "resourceMutation");
        }
      }
    }
  } catch {
    result = evaluatorFailure("OFF-T1002", "rootAccess");
  }

  try {
    await handle.close();
  } catch {
    return evaluatorFailure("OFF-T1002", "rootAccess");
  }
  return result;
}

function canonicalPackageResult(normalized: NormalizedResult): PackageResult {
  return {
    kind: "packageResult",
    normalized,
    canonicalBytes: canonicalizeJson(normalized),
  };
}

function retainedCore(normalized: NormalizedResult): {
  readonly packageIdentity: PackageIdentity;
  readonly resourceInventory: readonly NormalizedResource[];
  readonly relationshipInventory: readonly Record<string, unknown>[];
  readonly extensions: Readonly<Record<string, unknown>>;
} {
  return {
    packageIdentity: normalized.packageIdentity as PackageIdentity,
    resourceInventory: normalized.resourceInventory as readonly NormalizedResource[],
    relationshipInventory: normalized.relationshipInventory as readonly Record<string, unknown>[],
    extensions: normalized.extensions as Readonly<Record<string, unknown>>,
  };
}

export async function evaluatePackage(
  options: EvaluatePackageOptions,
): Promise<EvaluationResult> {
  if (
    typeof options !== "object" ||
    options === null ||
    typeof options.packageRoot !== "string" ||
    options.packageRoot.length === 0 ||
    typeof options.evaluatedAt !== "string" ||
    !isWholeSecondUtcTimestamp(options.evaluatedAt) ||
    !Array.isArray(options.requestedProfiles) ||
    !options.requestedProfiles.every(
      (profile) => typeof profile === "string" && isAbsoluteUri(profile),
    ) ||
    new Set(options.requestedProfiles).size !== options.requestedProfiles.length
  ) {
    return evaluatorFailure("OFF-T1004", "configuration");
  }
  const evaluationOptions: EvaluatePackageOptions = {
    packageRoot: resolve(options.packageRoot),
    evaluatedAt: options.evaluatedAt,
    requestedProfiles: [...options.requestedProfiles],
  };
  try {
    const manifest = await readManifest(evaluationOptions.packageRoot);
    if (manifest.kind === "evaluatorFailure") return manifest;
    if (manifest.kind === "missing") {
      return canonicalPackageResult(
        buildNormalizedResult({
          stage: "admissionFailed",
          evaluatedAt: evaluationOptions.evaluatedAt,
          requestedProfiles: evaluationOptions.requestedProfiles,
          diagnostics: [createDiagnostic("OFF.MANIFEST.MISSING", "", {})],
        }),
      );
    }

    let admission;
    try {
      admission = admitJson(manifest.bytes);
    } catch (error) {
      return error instanceof AdmissionLimitError
        ? evaluatorFailure("OFF-T1001", "resourceLimit")
        : evaluatorFailure("OFF-T1004", "internal");
    }
    if (!admission.ok) {
      return canonicalPackageResult(
        buildNormalizedResult({
          stage: "admissionFailed",
          evaluatedAt: evaluationOptions.evaluatedAt,
          requestedProfiles: evaluationOptions.requestedProfiles,
          diagnostics: admission.diagnostics as readonly Diagnostic[],
        }),
      );
    }

    const core = await evaluateCore(admission.value, evaluationOptions);
    if (core.kind === "evaluatorFailure") return core;
    const identity = core.normalized.packageIdentity as PackageIdentity | undefined;
    const corePassed = core.normalized.profileResults.core.status === "passed";
    const shouldEvaluatePublicEquity =
      corePassed &&
      evaluationOptions.requestedProfiles.includes(PUBLIC_EQUITY_PROFILE_URI) &&
      identity?.declaredProfiles.includes(PUBLIC_EQUITY_PROFILE_URI) === true;
    const shouldEvaluateWorkbookBinding =
      corePassed &&
      evaluationOptions.requestedProfiles.includes(WORKBOOK_BINDING_PROFILE_URI) &&
      identity?.declaredProfiles.includes(WORKBOOK_BINDING_PROFILE_URI) === true;
    if (!shouldEvaluatePublicEquity && !shouldEvaluateWorkbookBinding) {
      return canonicalPackageResult(core.normalized);
    }

    const publicEquity = shouldEvaluatePublicEquity
      ? evaluatePublicEquity(admission.value, {
          core: coreProfileContextFromNormalized(core.normalized),
          evaluatedAt: evaluationOptions.evaluatedAt,
        })
      : undefined;
    const workbookBinding = shouldEvaluateWorkbookBinding
      ? evaluateWorkbookBinding(
          admission.value,
          workbookBindingCoreContextFromNormalized(core.normalized),
        )
      : undefined;
    const coreFields = retainedCore(core.normalized);
    const diagnostics = [
      ...core.normalized.diagnostics,
      ...(publicEquity?.diagnostics ?? []),
      ...(workbookBinding?.diagnostics ?? []),
    ] as readonly Diagnostic[];
    const profileResultOverrides = {
      ...(publicEquity?.stage === "schemaFailed"
        ? { [PUBLIC_EQUITY_PROFILE_URI]: { status: "failed" as const } }
        : {}),
      ...(workbookBinding === undefined
        ? {}
        : {
            [WORKBOOK_BINDING_PROFILE_URI]: {
              status: workbookBinding.ok ? "passed" as const : "failed" as const,
              ...(workbookBinding.ok
                ? {
                    claim:
                      "Bound — author-declared workbook locators" as const,
                  }
                : {}),
            },
          }),
    };
    const stage =
      publicEquity === undefined || publicEquity.stage === "schemaFailed"
        ? "corePassed" as const
        : publicEquity.ok
          ? "freshnessCompleted" as const
          : "publicEquitySchemaPassed" as const;
    const shared = {
      stage,
      evaluatedAt: evaluationOptions.evaluatedAt,
      requestedProfiles: evaluationOptions.requestedProfiles,
      declaredProfiles: identity?.declaredProfiles ?? [],
      diagnostics,
      ...coreFields,
      ...(Object.keys(profileResultOverrides).length === 0
        ? {}
        : { profileResultOverrides }),
      ...(workbookBinding?.ok
        ? { workbookBindingEntities: workbookBinding.entities }
        : {}),
    } as const;

    return canonicalPackageResult(
      buildNormalizedResult({
        ...shared,
        ...(publicEquity !== undefined && publicEquity.stage !== "schemaFailed"
          ? { publicEquityEntities: publicEquity.entities }
          : {}),
        ...(publicEquity?.ok
          ? {
              resolvedLineage: publicEquity.resolvedLineage.map((edge) => ({
                ...edge,
              })),
              freshness: {
                leaves: publicEquity.freshness.leaves.map((leaf) => ({
                  ...leaf,
                })),
                headlines: publicEquity.freshness.headlines.map((headline) => ({
                  ...headline,
                })),
              },
            }
          : {}),
      }),
    );
  } catch {
    return evaluatorFailure("OFF-T1004", "internal");
  }
}
