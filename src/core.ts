import {
  createDiagnostic,
  finalizeDiagnostics,
  type Diagnostic,
} from "./diagnostics.ts";
import {
  buildNormalizedResult,
  type NormalizedResource,
  type NormalizedResult,
  type PackageIdentity,
} from "./normalize.ts";
import {
  resolveLocalResources,
  type EvaluatorFailure,
  type ResolveResourceOptions,
} from "./resources.ts";
import {
  isAbsoluteUri,
  validateCoreSchemaForEvaluation,
} from "./schema.ts";

interface LocalLocation {
  readonly kind: "local";
  readonly path: string;
}

interface RemoteLocation {
  readonly kind: "remote";
  readonly url: string;
}

type ResourceLocation = LocalLocation | RemoteLocation;

interface CoreResource {
  readonly id: string;
  readonly mediaType: string;
  readonly roles: readonly string[];
  readonly locations: readonly ResourceLocation[];
  readonly byteSize?: number;
  readonly sha256?: string;
}

interface CoreRelationship {
  readonly fromResourceId: string;
  readonly relation: string;
  readonly toResourceId: string;
}

interface CoreManifest {
  readonly offVersion: "0.1";
  readonly package: Omit<PackageIdentity, "declaredProfiles">;
  readonly profiles: readonly string[];
  readonly resources: readonly CoreResource[];
  readonly relationships?: readonly CoreRelationship[];
  readonly profileData?: Readonly<Record<string, unknown>>;
  readonly extensions?: Readonly<Record<string, unknown>>;
}

export interface CoreEvaluationOptions extends ResolveResourceOptions {
  readonly packageRoot: string;
  readonly evaluatedAt: string;
  readonly requestedProfiles: readonly string[];
}

export interface CorePackageResult {
  readonly kind: "packageResult";
  readonly normalized: NormalizedResult;
}

export type CoreEvaluationResult = CorePackageResult | EvaluatorFailure;

function pointerEscape(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function declaredProfiles(value: unknown): string[] | undefined {
  if (typeof value !== "object" || value === null || !("profiles" in value)) return undefined;
  const profiles = (value as { profiles?: unknown }).profiles;
  return Array.isArray(profiles) &&
    profiles.every((profile) => isAbsoluteUri(profile)) &&
    new Set(profiles).size === profiles.length
    ? profiles
    : undefined;
}

function duplicateIdDiagnostics(resources: readonly CoreResource[]): Diagnostic[] {
  const firstById = new Map<string, number>();
  const diagnostics: Diagnostic[] = [];
  resources.forEach((resource, index) => {
    const first = firstById.get(resource.id);
    if (first === undefined) firstById.set(resource.id, index);
    else diagnostics.push(
      createDiagnostic(
        "OFF.CORE.RESOURCE_ID",
        `/resources/${index}/id`,
        { firstInstanceLocation: `/resources/${first}/id` },
        resource.id,
      ),
    );
  });
  return diagnostics;
}

function remoteDiagnostics(resources: readonly CoreResource[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  resources.forEach((resource, resourceIndex) => {
    resource.locations.forEach((location, locationIndex) => {
      if (location.kind === "remote") {
        diagnostics.push(
          createDiagnostic(
            "OFF.CORE.REMOTE_NOT_EVALUATED",
            `/resources/${resourceIndex}/locations/${locationIndex}`,
            { locationIndex, url: location.url },
            resource.id,
          ),
        );
      }
    });
  });
  return diagnostics;
}

function referenceDiagnostics(
  manifest: CoreManifest,
  duplicateIds: boolean,
  resourceFileFailed: boolean,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (duplicateIds) return diagnostics;
  const resources = new Map(manifest.resources.map((resource) => [resource.id, resource]));
  const meaningResourceIds = new Set<string>([manifest.package.entrypointResourceId]);
  for (const relationship of manifest.relationships ?? []) {
    meaningResourceIds.add(relationship.fromResourceId);
    meaningResourceIds.add(relationship.toResourceId);
  }
  for (const resourceId of meaningResourceIds) {
    const resource = resources.get(resourceId);
    if (resource !== undefined && !resource.locations.some(({ kind }) => kind === "local")) {
      const resourceIndex = manifest.resources.indexOf(resource);
      diagnostics.push(
        createDiagnostic(
          "OFF.CORE.RESOURCE_REQUIRED_LOCAL",
          `/resources/${resourceIndex}`,
          { roles: [...resource.roles].sort() },
          resource.id,
        ),
      );
    }
  }

  if (!resourceFileFailed) {
    const entrypoint = resources.get(manifest.package.entrypointResourceId);
    const reason = entrypoint === undefined
      ? "unresolved"
      : !entrypoint.locations.some(({ kind }) => kind === "local")
        ? "missingLocal"
        : !entrypoint.roles.includes("entrypoint")
          ? "missingEntrypointRole"
          : undefined;
    if (reason !== undefined) {
      diagnostics.push(
        createDiagnostic(
          "OFF.CORE.ENTRYPOINT",
          "/package/entrypointResourceId",
          { reason, referencedId: manifest.package.entrypointResourceId },
        ),
      );
    }
  }

  for (const [index, relationship] of (manifest.relationships ?? []).entries()) {
    const from = resources.has(relationship.fromResourceId);
    const to = resources.has(relationship.toResourceId);
    if (from && to) continue;
    diagnostics.push(
      createDiagnostic(
        "OFF.CORE.RELATIONSHIP",
        `/relationships/${index}`,
        {
          fromResourceId: relationship.fromResourceId,
          reason: !from && !to ? "unresolvedBoth" : !from ? "unresolvedFrom" : "unresolvedTo",
          toResourceId: relationship.toResourceId,
        },
      ),
    );
  }
  return diagnostics;
}

function resourceInventory(
  manifest: CoreManifest,
  verified: ReadonlySet<string>,
): NormalizedResource[] {
  const inventory: NormalizedResource[] = [];
  const seenIds = new Set<string>();
  for (const resource of manifest.resources) {
    if (seenIds.has(resource.id)) continue;
    seenIds.add(resource.id);
    const locations: Record<string, unknown>[] = [];
    for (const location of resource.locations) {
      if (location.kind === "remote") {
        locations.push({
          kind: "remote",
          url: location.url,
          availability: "notEvaluated",
          integrity: "notEvaluated",
        });
      } else if (verified.has(`${resource.id}\u0000${location.path}`)) {
        locations.push({
          kind: "local",
          path: location.path,
          availability: "available",
          integrity: "verified",
        });
      }
    }
    if (locations.length === 0) continue;
    inventory.push({
      id: resource.id,
      mediaType: resource.mediaType,
      roles: resource.roles,
      locations,
      ...(resource.byteSize !== undefined
        ? { byteSize: resource.byteSize }
        : {}),
      ...(resource.sha256 !== undefined
        ? { sha256: resource.sha256 }
        : {}),
    });
  }
  return inventory;
}

export async function evaluateCore(
  value: unknown,
  options: CoreEvaluationOptions,
): Promise<CoreEvaluationResult> {
  const schema = validateCoreSchemaForEvaluation(value);
  if (!schema.valid) {
    const discoveredProfiles = declaredProfiles(value) ?? [];
    return {
      kind: "packageResult",
      normalized: buildNormalizedResult({
        stage: "schemaFailed",
        evaluatedAt: options.evaluatedAt,
        requestedProfiles: options.requestedProfiles,
        diagnostics: schema.diagnostics,
        declaredProfiles: discoveredProfiles,
        rootShapeFailed: schema.rootShapeFailed,
      }),
    };
  }

  const manifest = value as CoreManifest;
  const localInputs = manifest.resources.flatMap((resource, resourceIndex) =>
    resource.locations.flatMap((location, locationIndex) =>
      location.kind === "local"
        ? [{
            resourceId: resource.id,
            resourceIndex,
            locationIndex,
            path: location.path,
            byteSize: resource.byteSize as number,
            sha256: resource.sha256 as string,
          }]
        : [],
    ),
  );
  const resolved = await resolveLocalResources(options.packageRoot, localInputs, {
    ...(options.limits === undefined ? {} : { limits: options.limits }),
    ...(options.fileSystem === undefined ? {} : { fileSystem: options.fileSystem }),
  });
  if (resolved.kind === "evaluatorFailure") return resolved;

  const diagnostics = [
    ...duplicateIdDiagnostics(manifest.resources),
    ...resolved.diagnostics,
    ...remoteDiagnostics(manifest.resources),
  ];
  diagnostics.push(
    ...referenceDiagnostics(
      manifest,
      diagnostics.some(({ code }) => code === "OFF-E3001"),
      diagnostics.some(({ code }) => code === "OFF-E3004"),
    ),
  );
  const finalized = finalizeDiagnostics(diagnostics);
  const coreFailed = finalized.some(({ severity }) => severity === "error");
  const verified = new Set(
    resolved.verified.map((resource) => `${resource.resourceId}\u0000${resource.path}`),
  );
  const identity: PackageIdentity = {
    ...manifest.package,
    declaredProfiles: manifest.profiles,
  };
  const normalized = buildNormalizedResult({
    stage: coreFailed ? "coreFailed" : "corePassed",
    evaluatedAt: options.evaluatedAt,
    requestedProfiles: options.requestedProfiles,
    declaredProfiles: manifest.profiles,
    diagnostics: finalized,
    packageIdentity: identity,
    resourceInventory: resourceInventory(manifest, verified),
    ...(coreFailed
      ? {}
      : {
          relationshipInventory: (manifest.relationships ?? []).map((relationship) => ({
            ...relationship,
          })),
        }),
    extensions: manifest.extensions ?? {},
  });
  return { kind: "packageResult", normalized };
}
