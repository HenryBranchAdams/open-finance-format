import {
  createDiagnostic,
  finalizeDiagnostics,
  getRuleDefinition,
  type Diagnostic,
} from "./diagnostics.ts";
import {
  evaluateFreshness,
  type FreshnessEvaluation,
} from "./freshness.ts";
import {
  analyzeLineage,
  type GraphNodeKind,
  type LineageEdge,
} from "./lineage.ts";
import { cloneAndDeepFreezeJson } from "./immutable.ts";
import {
  PUBLIC_EQUITY_PROFILE_URI,
  type NormalizedResult,
} from "./normalize.ts";
import { selectedTerminalIdsByTarget } from "./reachability.ts";
import { validatePublicEquitySchema } from "./schema.ts";

export interface CoreProfileContext {
  readonly authorIds: ReadonlySet<string>;
  readonly verifiedLocalResources: ReadonlyMap<
    string,
    { readonly id: string; readonly sha256: string }
  >;
}

export interface PublicEquityEvaluationOptions {
  readonly core: CoreProfileContext;
  readonly evaluatedAt: string;
}

export type PublicEquityEntities = Readonly<
  Record<string, readonly Record<string, unknown>[]>
>;

export type PublicEquityEvaluation =
  | {
      readonly ok: false;
      readonly stage: "schemaFailed" | "publicEquitySchemaPassed";
      readonly entities: PublicEquityEntities;
      readonly diagnostics: readonly Diagnostic[];
    }
  | {
      readonly ok: true;
      readonly stage: "freshnessCompleted";
      readonly entities: PublicEquityEntities;
      readonly resolvedLineage: readonly LineageEdge[];
      readonly freshness: FreshnessEvaluation;
      readonly diagnostics: readonly Diagnostic[];
    };

type EntityKind =
  | "security"
  | "scenario"
  | "unit"
  | "source"
  | "sourceFact"
  | "assumption"
  | "output"
  | "attestation";

interface IndexedEntity {
  readonly id: string;
  readonly kind: EntityKind;
  readonly value: Record<string, any>;
  readonly pointer: string;
  readonly idPointer: string;
}

interface ProfileData extends Record<string, any> {
  readonly securities: readonly Record<string, any>[];
  readonly scenarios: readonly Record<string, any>[];
  readonly units: readonly Record<string, any>[];
  readonly sources: readonly Record<string, any>[];
  readonly sourceFacts: readonly Record<string, any>[];
  readonly assumptions: readonly Record<string, any>[];
  readonly outputs: readonly Record<string, any>[];
  readonly lineageEdges: readonly LineageEdge[];
  readonly attestations: readonly Record<string, any>[];
}

const collections = [
  ["securities", "security"],
  ["scenarios", "scenario"],
  ["units", "unit"],
  ["sources", "source"],
  ["sourceFacts", "sourceFact"],
  ["assumptions", "assumption"],
  ["outputs", "output"],
  ["attestations", "attestation"],
] as const satisfies readonly (readonly [keyof ProfileData, EntityKind])[];

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pointerEscape(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

const profilePointer = `/profileData/${pointerEscape(PUBLIC_EQUITY_PROFILE_URI)}`;

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareUtf16);
}

function normalizedEntity(entity: Record<string, any>): Record<string, unknown> {
  return {
    ...entity,
    ...(Array.isArray(entity.scenarioIds)
      ? { scenarioIds: sortedUnique(entity.scenarioIds) }
      : {}),
    ...(Array.isArray(entity.outputIds)
      ? { outputIds: sortedUnique(entity.outputIds) }
      : {}),
    ...(Array.isArray(entity.knownExclusions)
      ? { knownExclusions: [...entity.knownExclusions] }
      : {}),
  };
}

function normalizedEntities(profile: ProfileData): PublicEquityEntities {
  return Object.fromEntries(
    collections.map(([collection]) => [
      collection,
      [...profile[collection]]
        .sort((left, right) => compareUtf16(String(left.id), String(right.id)))
        .map(normalizedEntity),
    ]),
  );
}

function emptyEntities(): PublicEquityEntities {
  return Object.fromEntries(collections.map(([collection]) => [collection, []]));
}

function profileData(value: unknown): ProfileData | undefined {
  if (typeof value !== "object" || value === null || !("profileData" in value)) {
    return undefined;
  }
  const allProfiles = (value as { profileData?: unknown }).profileData;
  if (typeof allProfiles !== "object" || allProfiles === null) return undefined;
  const profile = (allProfiles as Record<string, unknown>)[PUBLIC_EQUITY_PROFILE_URI];
  return typeof profile === "object" && profile !== null
    ? (profile as ProfileData)
    : undefined;
}

function indexEntities(profile: ProfileData): {
  readonly byId: ReadonlyMap<string, IndexedEntity>;
  readonly diagnostics: readonly Diagnostic[];
} {
  const byId = new Map<string, IndexedEntity>();
  const diagnostics: Diagnostic[] = [];
  for (const [collection, kind] of collections) {
    profile[collection].forEach((entity, index) => {
      const pointer = `${profilePointer}/${collection}/${index}`;
      const id = String(entity.id);
      const existing = byId.get(id);
      if (existing !== undefined) {
        diagnostics.push(
          createDiagnostic(
            "OFF.PROFILE.ENTITY_ID",
            `${pointer}/id`,
            { entityKind: kind, firstInstanceLocation: existing.idPointer },
            id,
          ),
        );
        return;
      }
      byId.set(id, {
        id,
        kind,
        value: entity,
        pointer,
        idPointer: `${pointer}/id`,
      });
    });
  }
  return { byId, diagnostics: finalizeDiagnostics(diagnostics) };
}

function referenceDiagnostics(
  profile: ProfileData,
  byId: ReadonlyMap<string, IndexedEntity>,
  core: CoreProfileContext,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const emit = (
    containing: IndexedEntity | undefined,
    pointer: string,
    referencedId: string,
    expectedKind: string,
    valid: boolean,
  ): void => {
    if (valid) return;
    if (containing === undefined) {
      const rule = getRuleDefinition("OFF.PROFILE.REFERENCE");
      diagnostics.push(
        cloneAndDeepFreezeJson<Diagnostic>({
          code: rule.diagnostic.code,
          severity: rule.diagnostic.severity,
          instanceLocation: pointer,
          ruleId: "OFF.PROFILE.REFERENCE",
          parameters: { expectedKind, referencedId },
        }),
      );
    } else {
      diagnostics.push(
        createDiagnostic(
        "OFF.PROFILE.REFERENCE",
        pointer,
        { expectedKind, referencedId },
        containing.id,
        ),
      );
    }
  };
  const entity = (value: Record<string, any>): IndexedEntity => {
    const indexed = byId.get(String(value.id));
    if (indexed === undefined) throw new TypeError("Schema-passed entity was not indexed");
    return indexed;
  };
  const kindIs = (id: string, kind: EntityKind): boolean => byId.get(id)?.kind === kind;

  for (const value of profile.securities) {
    const current = entity(value);
    const referenced = String(value.reportingCurrencyUnitId);
    emit(
      current,
      `${current.pointer}/reportingCurrencyUnitId`,
      referenced,
      "currencyUnit",
      kindIs(referenced, "unit") && byId.get(referenced)?.value.kind === "currency",
    );
  }
  for (const value of profile.sources) {
    if (value.evidenceResourceId === undefined) continue;
    const current = entity(value);
    const referenced = String(value.evidenceResourceId);
    emit(
      current,
      `${current.pointer}/evidenceResourceId`,
      referenced,
      "verifiedLocalResource",
      core.verifiedLocalResources.has(referenced),
    );
  }
  for (const value of profile.sourceFacts) {
    const current = entity(value);
    if (value.unitId !== undefined) {
      const referenced = String(value.unitId);
      emit(current, `${current.pointer}/unitId`, referenced, "unit", kindIs(referenced, "unit"));
    }
    const sourceId = String(value.sourceId);
    emit(current, `${current.pointer}/sourceId`, sourceId, "source", kindIs(sourceId, "source"));
  }
  for (const value of profile.assumptions) {
    const current = entity(value);
    if (value.unitId !== undefined) {
      const referenced = String(value.unitId);
      emit(current, `${current.pointer}/unitId`, referenced, "unit", kindIs(referenced, "unit"));
    }
    (value.scenarioIds ?? []).forEach((scenarioId: unknown, index: number) => {
      const referenced = String(scenarioId);
      emit(current, `${current.pointer}/scenarioIds/${index}`, referenced, "scenario", kindIs(referenced, "scenario"));
    });
  }
  for (const value of profile.outputs) {
    const current = entity(value);
    if (value.unitId !== undefined) {
      const referenced = String(value.unitId);
      emit(current, `${current.pointer}/unitId`, referenced, "unit", kindIs(referenced, "unit"));
    }
    const scenarioId = String(value.scenarioId);
    emit(current, `${current.pointer}/scenarioId`, scenarioId, "scenario", kindIs(scenarioId, "scenario"));
    const artifactId = String(value.artifactResourceId);
    emit(current, `${current.pointer}/artifactResourceId`, artifactId, "verifiedLocalResource", core.verifiedLocalResources.has(artifactId));
    if (value.attestationId !== undefined) {
      const attestationId = String(value.attestationId);
      emit(current, `${current.pointer}/attestationId`, attestationId, "attestation", kindIs(attestationId, "attestation"));
    }
  }
  for (const value of profile.attestations) {
    const current = entity(value);
    (value.outputIds ?? []).forEach((outputId: unknown, index: number) => {
      const referenced = String(outputId);
      const output = byId.get(referenced);
      emit(
        current,
        `${current.pointer}/outputIds/${index}`,
        referenced,
        "headlineOutput",
        output?.kind === "output" && output.value.headline === true,
      );
    });
    const authorId = String(value.authorId);
    emit(current, `${current.pointer}/authorId`, authorId, "packageAuthor", core.authorIds.has(authorId));
    const artifactId = String(value.artifactResourceId);
    emit(current, `${current.pointer}/artifactResourceId`, artifactId, "verifiedLocalResource", core.verifiedLocalResources.has(artifactId));
  }
  profile.lineageEdges.forEach((edge, index) => {
    const from = byId.get(edge.fromId);
    emit(
      from,
      `${profilePointer}/lineageEdges/${index}/fromId`,
      edge.fromId,
      "output",
      from?.kind === "output",
    );
    const to = byId.get(edge.toId);
    emit(
      from,
      `${profilePointer}/lineageEdges/${index}/toId`,
      edge.toId,
      "lineageDependency",
      to?.kind === "output" || to?.kind === "sourceFact" || to?.kind === "assumption",
    );
  });
  return finalizeDiagnostics(diagnostics);
}

function headlineDiagnostics(profile: ProfileData): Diagnostic[] {
  const fromIds = new Set(profile.lineageEdges.map(({ fromId }) => fromId));
  const diagnostics: Diagnostic[] = [];
  profile.outputs.forEach((output, index) => {
    if (output.headline === true && !fromIds.has(String(output.id))) {
      diagnostics.push(
        createDiagnostic(
          "OFF.PROFILE.HEADLINE",
          `${profilePointer}/outputs/${index}`,
          { missingFields: ["lineageEdges"] },
          String(output.id),
        ),
      );
    }
  });
  return finalizeDiagnostics(diagnostics);
}

function edgeDiagnostics(profile: ProfileData): Diagnostic[] {
  const firstByPair = new Set<string>();
  const diagnostics: Diagnostic[] = [];
  profile.lineageEdges.forEach((edge, index) => {
    const pair = `${edge.fromId}\u0000${edge.toId}`;
    const reason = edge.fromId === edge.toId
      ? "self"
      : firstByPair.has(pair)
        ? "duplicate"
        : undefined;
    firstByPair.add(pair);
    if (reason !== undefined) {
      diagnostics.push(
        createDiagnostic(
          "OFF.PROFILE.LINEAGE_EDGE",
          `${profilePointer}/lineageEdges/${index}`,
          { fromId: edge.fromId, reason, toId: edge.toId },
          edge.fromId,
        ),
      );
    }
  });
  return finalizeDiagnostics(diagnostics);
}

function graphKinds(profile: ProfileData): Map<string, GraphNodeKind> {
  const kinds = new Map<string, GraphNodeKind>();
  for (const output of profile.outputs) kinds.set(String(output.id), "output");
  for (const fact of profile.sourceFacts) kinds.set(String(fact.id), "sourceFact");
  for (const assumption of profile.assumptions) kinds.set(String(assumption.id), "assumption");
  return kinds;
}

function terminalDiagnostics(
  profile: ProfileData,
  graph: Extract<ReturnType<typeof analyzeLineage>, { ok: true }>["graph"],
  kinds: ReadonlyMap<string, GraphNodeKind>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const headlineIds = profile.outputs
    .filter(({ headline }) => headline === true)
    .map(({ id }) => String(id));
  const unterminatedOutputIds = graph.nodes.filter(
    (id) =>
      kinds.get(id) === "output" &&
      (graph.adjacency.get(id) ?? []).length === 0,
  );
  const unterminatedByHeadline = selectedTerminalIdsByTarget(
    graph,
    headlineIds,
    unterminatedOutputIds,
  );
  profile.outputs.forEach((output, index) => {
    if (output.headline !== true) return;
    const unterminatedNodeIds = sortedUnique(
      unterminatedByHeadline.get(String(output.id)) ?? [],
    );
    if (unterminatedNodeIds.length > 0) {
      diagnostics.push(
        createDiagnostic(
          "OFF.PROFILE.LINEAGE_TERMINAL",
          `${profilePointer}/outputs/${index}`,
          { unterminatedNodeIds },
          String(output.id),
        ),
      );
    }
  });
  return finalizeDiagnostics(diagnostics);
}

function attestationDiagnostics(
  profile: ProfileData,
  core: CoreProfileContext,
): Diagnostic[] {
  const attestations = new Map(profile.attestations.map((value) => [String(value.id), value]));
  const coverage = new Map<string, Record<string, any>[]>();
  for (const attestation of profile.attestations) {
    for (const outputId of attestation.outputIds ?? []) {
      const list = coverage.get(String(outputId)) ?? [];
      list.push(attestation);
      coverage.set(String(outputId), list);
    }
  }
  const diagnostics: Diagnostic[] = [];
  profile.outputs.forEach((output, index) => {
    if (output.headline !== true) return;
    const outputId = String(output.id);
    const attestationId = String(output.attestationId);
    const selected = attestations.get(attestationId);
    const covering = coverage.get(outputId) ?? [];
    let reason: string | undefined;
    if (covering.length === 0) reason = "missingCoverage";
    else if (covering.length > 1) reason = "multipleCoverage";
    else if (
      selected === undefined ||
      String(covering[0]?.id) !== attestationId
    ) {
      reason = "outputNotCovered";
    }
    else if (String(selected.artifactResourceId) !== String(output.artifactResourceId)) {
      reason = "artifactResourceMismatch";
    } else if (
      core.verifiedLocalResources.get(String(selected.artifactResourceId))?.sha256 !==
      String(selected.artifactSha256)
    ) {
      reason = "artifactDigestMismatch";
    }
    if (reason !== undefined) {
      diagnostics.push(
        createDiagnostic(
          "OFF.PROFILE.ATTESTATION",
          `${profilePointer}/outputs/${index}/attestationId`,
          { attestationId, reason },
          outputId,
        ),
      );
    }
  });
  return finalizeDiagnostics(diagnostics);
}

export function coreProfileContextFromNormalized(
  normalized: NormalizedResult,
): CoreProfileContext {
  const identity = normalized.packageIdentity as
    | { authors?: readonly { id?: unknown }[] }
    | undefined;
  const authorIds = new Set(
    (identity?.authors ?? [])
      .map(({ id }) => id)
      .filter((id): id is string => typeof id === "string"),
  );
  const verifiedLocalResources = new Map<string, { id: string; sha256: string }>();
  const inventory = Array.isArray(normalized.resourceInventory)
    ? normalized.resourceInventory
    : [];
  for (const candidate of inventory) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const resource = candidate as Record<string, unknown>;
    if (
      typeof resource.id === "string" &&
      typeof resource.sha256 === "string" &&
      Array.isArray(resource.locations) &&
      resource.locations.some(
        (location) =>
          typeof location === "object" &&
          location !== null &&
          (location as Record<string, unknown>).kind === "local" &&
          (location as Record<string, unknown>).availability === "available" &&
          (location as Record<string, unknown>).integrity === "verified",
      )
    ) {
      verifiedLocalResources.set(resource.id, { id: resource.id, sha256: resource.sha256 });
    }
  }
  return { authorIds, verifiedLocalResources };
}

export function evaluatePublicEquity(
  value: unknown,
  options: PublicEquityEvaluationOptions,
): PublicEquityEvaluation {
  const schema = validatePublicEquitySchema(value);
  const profile = profileData(value);
  if (!schema.valid || profile === undefined) {
    return {
      ok: false,
      stage: "schemaFailed",
      entities: emptyEntities(),
      diagnostics: schema.diagnostics,
    };
  }
  const entities = normalizedEntities(profile);
  const indexed = indexEntities(profile);
  if (indexed.diagnostics.length > 0) {
    return { ok: false, stage: "publicEquitySchemaPassed", entities, diagnostics: indexed.diagnostics };
  }
  const references = referenceDiagnostics(profile, indexed.byId, options.core);
  if (references.length > 0) {
    return { ok: false, stage: "publicEquitySchemaPassed", entities, diagnostics: references };
  }
  const headlines = headlineDiagnostics(profile);
  const edges = edgeDiagnostics(profile);
  if (edges.length > 0) {
    return {
      ok: false,
      stage: "publicEquitySchemaPassed",
      entities,
      diagnostics: finalizeDiagnostics([...headlines, ...edges]),
    };
  }

  const kinds = graphKinds(profile);
  const lineage = analyzeLineage(kinds, profile.lineageEdges);
  if (!lineage.ok) {
    return {
      ok: false,
      stage: "publicEquitySchemaPassed",
      entities,
      diagnostics: finalizeDiagnostics([
        ...headlines,
        createDiagnostic(
          "OFF.PROFILE.LINEAGE_CYCLE",
          `${profilePointer}/lineageEdges`,
          { cycleEntityIds: lineage.cycleEntityIds },
        ),
      ]),
    };
  }
  if (headlines.length > 0) {
    return {
      ok: false,
      stage: "publicEquitySchemaPassed",
      entities,
      diagnostics: headlines,
    };
  }
  const terminals = terminalDiagnostics(profile, lineage.graph, kinds);
  if (terminals.length > 0) {
    return { ok: false, stage: "publicEquitySchemaPassed", entities, diagnostics: terminals };
  }
  const attestations = attestationDiagnostics(profile, options.core);
  if (attestations.length > 0) {
    return { ok: false, stage: "publicEquitySchemaPassed", entities, diagnostics: attestations };
  }

  const freshness = evaluateFreshness({
    evaluatedAt: options.evaluatedAt,
    graph: lineage.graph,
    leaves: [
      ...profile.sourceFacts.map((fact, index) => ({
        id: String(fact.id),
        threshold: String(fact.staleAt),
        pointer: `${profilePointer}/sourceFacts/${index}/staleAt`,
      })),
      ...profile.assumptions.map((assumption, index) => ({
        id: String(assumption.id),
        threshold: String(assumption.reviewBy),
        pointer: `${profilePointer}/assumptions/${index}/reviewBy`,
      })),
    ],
    headlines: profile.outputs.flatMap((output, index) =>
      output.headline === true
        ? [{ id: String(output.id), pointer: `${profilePointer}/outputs/${index}` }]
        : [],
    ),
  });
  return {
    ok: true,
    stage: "freshnessCompleted",
    entities,
    resolvedLineage: lineage.graph.edges,
    freshness,
    diagnostics: freshness.diagnostics,
  };
}
