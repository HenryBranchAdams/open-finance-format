import { NORMALIZER_VERSION, OFF_VERSION } from "./constants.ts";
import {
  createDiagnostic,
  finalizeDiagnostics,
  getRuleDefinition,
  outcomeFromDiagnostics,
  type Diagnostic,
} from "./diagnostics.ts";
import { cloneAndDeepFreezeJson } from "./immutable.ts";
import { isAbsoluteUri } from "./uri.ts";

export const PUBLIC_EQUITY_PROFILE_URI =
  "https://openfinanceformat.org/profiles/public-equity-research/0.1";

export type RetentionStage =
  | "admissionFailed"
  | "schemaFailed"
  | "coreFailed"
  | "corePassed"
  | "publicEquitySchemaPassed"
  | "publicEquityGraphPassed"
  | "freshnessCompleted";

export type ProfileStatus = "passed" | "failed" | "notEvaluated";

export interface ProfileResultOverride {
  readonly status: ProfileStatus;
  readonly claim?: "Traceable — author-declared lineage";
  readonly structuralConformance?: "passed";
  readonly lineageCompleteness?: "attested-not-independently-verified";
}

export interface PackageIdentity {
  readonly id: string;
  readonly releaseId: string;
  readonly releaseVersion: string;
  readonly title: string;
  readonly authors: readonly { readonly id: string; readonly name: string }[];
  readonly license: { readonly id: string; readonly url?: string };
  readonly publishedAt: string;
  readonly canonicalUrl: string;
  readonly entrypointResourceId: string;
  readonly declaredProfiles: readonly string[];
}

export interface NormalizedResource {
  readonly id: string;
  readonly mediaType: string;
  readonly roles: readonly string[];
  readonly locations: readonly Record<string, unknown>[];
  readonly byteSize?: number;
  readonly sha256?: string;
}

export interface BuildNormalizedResultInput {
  readonly stage: RetentionStage;
  readonly evaluatedAt: string;
  readonly requestedProfiles: readonly string[];
  readonly declaredProfiles?: readonly string[];
  readonly profileResultOverrides?: Readonly<Record<string, ProfileResultOverride>>;
  readonly diagnostics: readonly Diagnostic[];
  readonly rootShapeFailed?: boolean;
  readonly packageIdentity?: PackageIdentity;
  readonly resourceInventory?: readonly NormalizedResource[];
  readonly relationshipInventory?: readonly Record<string, unknown>[];
  readonly extensions?: Readonly<Record<string, unknown>>;
  readonly publicEquityEntities?: Readonly<Record<string, readonly Record<string, unknown>[]>>;
  readonly resolvedLineage?: readonly Record<string, unknown>[];
  readonly freshness?: {
    readonly leaves: readonly Record<string, unknown>[];
    readonly headlines: readonly Record<string, unknown>[];
  };
}

export interface NormalizedResult extends Record<string, unknown> {
  readonly evaluationContext: {
    readonly offVersion: typeof OFF_VERSION;
    readonly normalizerVersion: typeof NORMALIZER_VERSION;
    readonly evaluatedAt: string;
    readonly requestedProfiles: readonly string[];
  };
  readonly outcome: "valid" | "validWithWarnings" | "invalid";
  readonly profileResults: {
    readonly core: { readonly status: "passed" | "failed" };
    readonly declared: readonly Record<string, unknown>[];
  };
  readonly diagnostics: readonly Diagnostic[];
}

const stageRank: Readonly<Record<RetentionStage, number>> = {
  admissionFailed: 0,
  schemaFailed: 1,
  coreFailed: 2,
  corePassed: 3,
  publicEquitySchemaPassed: 4,
  publicEquityGraphPassed: 5,
  freshnessCompleted: 6,
};

const MANIFEST_PUBLIC_EQUITY_BASE =
  "/profileData/https:~1~1openfinanceformat.org~1profiles~1public-equity-research~10.1";

function diagnosticStage(diagnostic: Diagnostic): string | undefined {
  try {
    return getRuleDefinition(diagnostic.ruleId).stage;
  } catch {
    return undefined;
  }
}

function isPublicEquitySchemaError(diagnostic: Diagnostic): boolean {
  if (diagnostic.severity !== "error" || diagnosticStage(diagnostic) !== "schema") {
    return false;
  }
  if (
    diagnostic.instanceLocation === "/profileData" &&
    diagnostic.ruleId === "OFF.SCHEMA.PROFILE_DECLARATION" &&
    diagnostic.parameters.reason === "required"
  ) {
    return true;
  }
  return diagnostic.instanceLocation === MANIFEST_PUBLIC_EQUITY_BASE ||
    diagnostic.instanceLocation.startsWith(`${MANIFEST_PUBLIC_EQUITY_BASE}/`);
}

function isApplicableProfileError(
  diagnostic: Diagnostic,
  profileUri: string,
): boolean {
  if (diagnostic.severity !== "error") return false;
  const stage = diagnosticStage(diagnostic);
  if (stage === "request") return diagnostic.entityId === profileUri;
  return profileUri === PUBLIC_EQUITY_PROFILE_URI &&
    (stage === "publicEquity" || isPublicEquitySchemaError(diagnostic));
}

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

function isWholeSecondUtcTimestamp(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u.exec(value);
  return (
    match !== null &&
    isRealCalendarDate(match[1] ?? "") &&
    Number(match[2]) <= 23 &&
    Number(match[3]) <= 59 &&
    Number(match[4]) <= 59
  );
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareUtf16);
}

function requireValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new TypeError(`${label} is required at this normalized-result stage`);
  }
  return value;
}

function sortById<T extends Record<string, unknown>>(values: readonly T[]): T[] {
  return [...values].sort((left, right) =>
    compareUtf16(String(left.id), String(right.id)),
  );
}

function normalizePackageIdentity(identity: PackageIdentity): Record<string, unknown> {
  return {
    id: identity.id,
    releaseId: identity.releaseId,
    releaseVersion: identity.releaseVersion,
    title: identity.title,
    authors: [...identity.authors].sort((left, right) =>
      compareUtf16(left.id, right.id),
    ),
    license: { ...identity.license },
    publishedAt: identity.publishedAt,
    canonicalUrl: identity.canonicalUrl,
    entrypointResourceId: identity.entrypointResourceId,
    declaredProfiles: sortedUnique(identity.declaredProfiles),
  };
}

function normalizeResources(
  resources: readonly NormalizedResource[],
): Record<string, unknown>[] {
  return [...resources]
    .sort((left, right) => compareUtf16(left.id, right.id))
    .map((resource) => ({
      id: resource.id,
      mediaType: resource.mediaType,
      roles: sortedUnique(resource.roles),
      locations: [...resource.locations].sort((left, right) => {
        const kindOrder = compareUtf16(String(left.kind), String(right.kind));
        if (kindOrder !== 0) {
          return kindOrder;
        }
        return compareUtf16(
          String(left.path ?? left.url),
          String(right.path ?? right.url),
        );
      }),
      ...(resource.byteSize === undefined ? {} : { byteSize: resource.byteSize }),
      ...(resource.sha256 === undefined ? {} : { sha256: resource.sha256 }),
    }));
}

function normalizeRelationships(
  relationships: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  return [...relationships].sort(
    (left, right) =>
      compareUtf16(String(left.fromResourceId), String(right.fromResourceId)) ||
      compareUtf16(String(left.relation), String(right.relation)) ||
      compareUtf16(String(left.toResourceId), String(right.toResourceId)),
  );
}

function createProfileResults(
  stage: RetentionStage,
  declaredProfiles: readonly string[],
  requestedProfiles: readonly string[],
  overrides: Readonly<Record<string, ProfileResultOverride>>,
  requestPrerequisitePassed: boolean,
): NormalizedResult["profileResults"] {
  if (stage === "admissionFailed") {
    return {
      core: { status: "failed" },
      declared: [],
    };
  }
  const requested = new Set(requestedProfiles);
  const declaredSet = new Set(declaredProfiles);
  const declared = sortedUnique([...declaredProfiles, ...requestedProfiles]).map((uri) => {
    const override = overrides[uri];
    const isRequested = requested.has(uri);
    let inferredStatus: ProfileStatus = "notEvaluated";
    if (
      requestPrerequisitePassed &&
      isRequested &&
      (!declaredSet.has(uri) || uri !== PUBLIC_EQUITY_PROFILE_URI)
    ) {
      inferredStatus = "failed";
    } else if (uri === PUBLIC_EQUITY_PROFILE_URI && isRequested) {
      if (stageRank[stage] >= stageRank.publicEquityGraphPassed) {
        inferredStatus = "passed";
      } else if (stage === "publicEquitySchemaPassed") {
        inferredStatus = "failed";
      }
    }
    const status = override?.status ?? inferredStatus;
    const passedPublicEquity =
      uri === PUBLIC_EQUITY_PROFILE_URI && status === "passed";
    return {
      uri,
      requested: isRequested,
      status,
      ...(passedPublicEquity
        ? {
            claim:
              override?.claim ?? "Traceable — author-declared lineage",
            structuralConformance:
              override?.structuralConformance ?? "passed",
            lineageCompleteness:
              override?.lineageCompleteness ??
              "attested-not-independently-verified",
          }
        : {}),
    };
  });
  return {
    core: { status: stageRank[stage] >= stageRank.corePassed ? "passed" : "failed" },
    declared,
  };
}

function normalizeProfileEntities(
  entities: Readonly<Record<string, readonly Record<string, unknown>[]>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(entities)
      .sort(([left], [right]) => compareUtf16(left, right))
      .map(([collection, values]) => [collection, sortById(values)]),
  );
}

function normalizeLineage(
  edges: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  return [...edges].sort(
    (left, right) =>
      compareUtf16(String(left.fromId), String(right.fromId)) ||
      compareUtf16(String(left.toId), String(right.toId)),
  );
}

function normalizeFreshness(
  freshness: NonNullable<BuildNormalizedResultInput["freshness"]>,
): Record<string, unknown> {
  return {
    leaves: [...freshness.leaves].sort((left, right) =>
      compareUtf16(String(left.entityId), String(right.entityId)),
    ),
    headlines: [...freshness.headlines]
      .map<Record<string, unknown>>((headline) => ({
        ...headline,
        ...(Array.isArray(headline.staleDependencyIds)
          ? {
              staleDependencyIds: sortedUnique(
                headline.staleDependencyIds.filter(
                  (value): value is string => typeof value === "string",
                ),
              ),
            }
          : {}),
      }))
      .sort((left, right) =>
        compareUtf16(String(left.entityId), String(right.entityId)),
      ),
  };
}

export function buildNormalizedResult(
  input: BuildNormalizedResultInput,
): NormalizedResult {
  if (!isWholeSecondUtcTimestamp(input.evaluatedAt)) {
    throw new TypeError("evaluatedAt must be a real whole-second UTC timestamp ending in Z");
  }
  const explicitDeclaredProfiles =
    input.stage === "admissionFailed"
      ? []
      : requireValue(input.declaredProfiles, "declaredProfiles");
  for (const [label, values] of [
    ["requestedProfiles", input.requestedProfiles],
    ["declaredProfiles", explicitDeclaredProfiles],
  ] as const) {
    for (const value of values) {
      if (!isAbsoluteUri(value)) {
        throw new TypeError(`${label} must contain only exact absolute URI strings`);
      }
    }
  }
  const requestedProfiles = sortedUnique(input.requestedProfiles);
  const declaredProfiles = sortedUnique(explicitDeclaredProfiles);
  if (
    input.stage !== "admissionFailed" &&
    declaredProfiles.length !== explicitDeclaredProfiles.length
  ) {
    throw new TypeError("declaredProfiles must contain unique exact URI strings");
  }
  if (requestedProfiles.length !== input.requestedProfiles.length) {
    throw new TypeError("requestedProfiles must contain unique exact URI strings");
  }
  if (input.rootShapeFailed === true && input.stage !== "schemaFailed") {
    throw new TypeError("rootShapeFailed is valid only for the schemaFailed stage");
  }

  const profileStage =
    stageRank[input.stage] >= stageRank.publicEquitySchemaPassed;
  if (
    profileStage &&
    (!requestedProfiles.includes(PUBLIC_EQUITY_PROFILE_URI) ||
      !declaredProfiles.includes(PUBLIC_EQUITY_PROFILE_URI))
  ) {
    throw new TypeError(
      "Public Equity stages require the profile to be requested and declared",
    );
  }

  for (const [uri, override] of Object.entries(
    input.profileResultOverrides ?? {},
  )) {
    if (uri !== PUBLIC_EQUITY_PROFILE_URI) {
      throw new TypeError(`profileResultOverrides contains unknown profile: ${uri}`);
    }
    const graphCompleted =
      stageRank[input.stage] >= stageRank.publicEquityGraphPassed &&
      requestedProfiles.includes(uri) &&
      declaredProfiles.includes(uri);
    const hasClaim =
      override.claim !== undefined ||
      override.structuralConformance !== undefined ||
      override.lineageCompleteness !== undefined;
    if (override.status === "passed" && !graphCompleted) {
      throw new TypeError(
        "A profile cannot pass before requested graph completion",
      );
    }
    if (hasClaim && (override.status !== "passed" || !graphCompleted)) {
      throw new TypeError(
        "Traceable claims require a passed profile after graph completion",
      );
    }
  }

  const targetDiagnostics: Diagnostic[] = [];
  const profileTargetPrerequisitePassed = input.rootShapeFailed !== true;
  if (input.stage !== "admissionFailed" && profileTargetPrerequisitePassed) {
    const declaredSet = new Set(declaredProfiles);
    for (const uri of requestedProfiles) {
      if (!declaredSet.has(uri)) {
        targetDiagnostics.push(
          createDiagnostic(
            "OFF.SCHEMA.PROFILE_TARGET",
            "",
            { reason: "notDeclared" },
            uri,
          ),
        );
      } else if (uri !== PUBLIC_EQUITY_PROFILE_URI) {
        targetDiagnostics.push(
          createDiagnostic(
            "OFF.SCHEMA.PROFILE_TARGET",
            "",
            { reason: "unsupported" },
            uri,
          ),
        );
      }
    }
  }
  const diagnostics = finalizeDiagnostics([
    ...input.diagnostics,
    ...targetDiagnostics,
  ]);
  const profileResults = createProfileResults(
    input.stage,
    declaredProfiles,
    requestedProfiles,
    input.profileResultOverrides ?? {},
    profileTargetPrerequisitePassed,
  );
  for (const row of profileResults.declared) {
    const uri = String(row.uri);
    const requested = row.requested === true;
    const hasApplicableError = requested && diagnostics.some((diagnostic) =>
      isApplicableProfileError(diagnostic, uri)
    );
    const profileSucceeded = requested &&
      uri === PUBLIC_EQUITY_PROFILE_URI &&
      stageRank[input.stage] >= stageRank.publicEquityGraphPassed;
    const expectedStatus: ProfileStatus = !requested
      ? "notEvaluated"
      : hasApplicableError
        ? "failed"
        : profileSucceeded
          ? "passed"
          : "notEvaluated";
    if (row.status !== expectedStatus) {
      throw new TypeError(
        `Profile ${uri} status ${String(row.status)} is incompatible with its evaluation stage and diagnostics; expected ${expectedStatus}`,
      );
    }
  }
  if (
    [
      "admissionFailed",
      "schemaFailed",
      "coreFailed",
      "publicEquitySchemaPassed",
    ].includes(input.stage) &&
    !diagnostics.some(({ severity }) => severity === "error")
  ) {
    throw new TypeError(`${input.stage} requires at least one error diagnostic`);
  }

  const result: NormalizedResult = {
    evaluationContext: {
      offVersion: OFF_VERSION,
      normalizerVersion: NORMALIZER_VERSION,
      evaluatedAt: input.evaluatedAt,
      requestedProfiles,
    },
    outcome: outcomeFromDiagnostics(diagnostics),
    profileResults,
    diagnostics,
  };

  if (stageRank[input.stage] >= stageRank.coreFailed) {
    const packageIdentity = requireValue(input.packageIdentity, "packageIdentity");
    if (
      JSON.stringify(sortedUnique(packageIdentity.declaredProfiles)) !==
      JSON.stringify(declaredProfiles)
    ) {
      throw new TypeError(
        "packageIdentity.declaredProfiles must equal declaredProfiles",
      );
    }
    result.packageIdentity = normalizePackageIdentity(packageIdentity);
    result.resourceInventory = normalizeResources(
      requireValue(input.resourceInventory, "resourceInventory"),
    );
    result.extensions = { ...(input.extensions ?? {}) };
  }
  if (stageRank[input.stage] >= stageRank.corePassed) {
    result.relationshipInventory = normalizeRelationships(
      requireValue(input.relationshipInventory, "relationshipInventory"),
    );
  }
  if (stageRank[input.stage] >= stageRank.publicEquitySchemaPassed) {
    result.profileEntities = {
      [PUBLIC_EQUITY_PROFILE_URI]: normalizeProfileEntities(
        requireValue(input.publicEquityEntities, "publicEquityEntities"),
      ),
    };
  }
  if (stageRank[input.stage] >= stageRank.publicEquityGraphPassed) {
    result.resolvedLineage = normalizeLineage(
      requireValue(input.resolvedLineage, "resolvedLineage"),
    );
  }
  if (stageRank[input.stage] >= stageRank.freshnessCompleted) {
    result.freshness = normalizeFreshness(
      requireValue(input.freshness, "freshness"),
    );
  }

  return cloneAndDeepFreezeJson(result);
}
