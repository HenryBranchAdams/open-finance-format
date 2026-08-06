import { resourceOpaqueId } from "./catalog.ts";
import type { EvaluationState, NormalizedResult, OffApi } from "./types.ts";

export const CLAIM_LIMITATIONS = [
  "Traceable — author-declared lineage is structural conformance, not independent lineage review or financial correctness.",
  "Bound — author-declared workbook locators does not prove locator existence, cell values, formulas, recalculation, or live-sheet equivalence.",
  "Remote resources remain notEvaluated unless the normative evaluator says otherwise.",
  "A warning-bearing package may still be structurally valid.",
  "OpenBB is a non-normative OFF consumer and does not prove interoperability, adoption, deployment readiness, or financial correctness.",
  "This local inspection service provides no investment advice, trading, execution, or live market data.",
] as const;

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function records(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    : [];
}

function publicEntities(normalized: NormalizedResult, api: OffApi): Record<string, unknown> {
  return object(normalized.profileEntities?.[api.PUBLIC_EQUITY_PROFILE_URI]);
}

function workbookEntities(normalized: NormalizedResult, api: OffApi): Record<string, unknown> {
  return object(normalized.profileEntities?.[api.WORKBOOK_BINDING_PROFILE_URI]);
}

function unitIndex(entities: Record<string, unknown>): ReadonlyMap<string, Record<string, unknown>> {
  return new Map(records(entities.units).map((unit) => [String(unit.id), unit]));
}

function entityIndex(entities: Record<string, unknown>, name: string): ReadonlyMap<string, Record<string, unknown>> {
  return new Map(records(entities[name]).map((item) => [String(item.id), item]));
}

function valueFields(item: Record<string, unknown>): Record<string, unknown> {
  const value = object(item.value);
  return {
    value: typeof value.value === "string" ? value.value : null,
    value_type: typeof value.type === "string" ? value.type : null,
  };
}

function unitFields(item: Record<string, unknown>, units: ReadonlyMap<string, Record<string, unknown>>): Record<string, unknown> {
  const unitId = typeof item.unitId === "string" ? item.unitId : null;
  const unit = unitId === null ? undefined : units.get(unitId);
  return {
    unit_id: unitId,
    unit_label: typeof unit?.label === "string" ? unit.label : null,
    unit_symbol: typeof unit?.symbol === "string" ? unit.symbol : null,
    unit_kind: typeof unit?.kind === "string" ? unit.kind : null,
    unit_currency: typeof unit?.currency === "string" ? unit.currency : null,
  };
}

function requireNormalized(state: EvaluationState): NormalizedResult | undefined {
  return state.result.kind === "packageResult" ? state.result.normalized : undefined;
}

function timed(state: EvaluationState, row: Record<string, unknown>): Record<string, unknown> {
  return { ...row, evaluated_at: state.evaluatedAt };
}

export function overview(state: EvaluationState): Record<string, unknown> {
  if (state.result.kind === "evaluatorFailure") {
    return {
      package_id: state.record.id,
      evaluated_at: state.evaluatedAt,
      state: "degraded",
      outcome: "evaluatorFailure",
      evaluator_failure: {
        code: state.result.code,
        operation: state.result.operation,
      },
      requested_profiles: state.requestedProfiles,
      limitations: CLAIM_LIMITATIONS,
    };
  }
  const normalized = state.result.normalized;
  const identity = object(normalized.packageIdentity);
  return {
    package_id: state.record.id,
    evaluated_at: state.evaluatedAt,
    state: normalized.outcome === "invalid" ? "degraded" : "evaluated",
    outcome: normalized.outcome,
    package_identity: identity,
    release_id: identity.releaseId ?? null,
    release_version: identity.releaseVersion ?? null,
    requested_profiles: state.requestedProfiles,
    declared_profiles: Array.isArray(identity.declaredProfiles) ? identity.declaredProfiles : [],
    profile_results: normalized.profileResults,
    diagnostic_counts: {
      errors: normalized.diagnostics.filter((item) => item.severity === "error").length,
      warnings: normalized.diagnostics.filter((item) => item.severity === "warning").length,
    },
    limitations: CLAIM_LIMITATIONS,
  };
}

function markdownValue(value: unknown): string {
  return String(value ?? "unknown").replaceAll(/[\\`*_{}\[\]<>#|]/gu, "\\$&");
}

export function contextMarkdown(state: EvaluationState): string {
  const view = overview(state);
  const identity = object(view.package_identity);
  const declared = Array.isArray(view.declared_profiles) ? view.declared_profiles : [];
  return [
    `# ${markdownValue(identity.title ?? state.record.title)}`,
    "",
    `**Package:** \`${markdownValue(state.record.id)}\`  `,
    `**Release:** ${markdownValue(view.release_version)}  `,
    `**Outcome:** ${markdownValue(view.outcome)}  `,
    `**Evaluated at:** \`${markdownValue(state.evaluatedAt)}\`  `,
    `**Declared profiles:** ${declared.length === 0 ? "None" : declared.map((item) => `\`${markdownValue(item)}\``).join(", ")}`,
    "",
    "OFF is the normative package authority. This OpenBB projection is a read-only, non-normative inspection surface.",
  ].join("\n");
}

export function claimsMarkdown(state: EvaluationState): string {
  return [
    "# Claims boundary",
    "",
    `Evaluation context: \`${markdownValue(state.evaluatedAt)}\``,
    "",
    ...CLAIM_LIMITATIONS.map((item) => `- ${item}`),
    "",
    "Workbook Binding is a post-v0.1-rc.1 sidecar profile. It is not part of the frozen v0.1-rc.1 release closure.",
  ].join("\n");
}

export function profileResults(state: EvaluationState): Record<string, unknown>[] {
  if (state.result.kind !== "packageResult") return [];
  const results = state.result.normalized.profileResults;
  return [
    timed(state, {
      profile: "OFF Core",
      declared: true,
      requested: true,
      status: results.core.status,
      claim: "Structural Core evaluation",
    }),
    ...records(results.declared).map((result) => timed(state, {
      profile: result.uri ?? null,
      declared: true,
      requested: result.requested ?? false,
      status: result.status ?? "notEvaluated",
      claim: result.claim ?? null,
    })),
  ];
}

export function normalizedMarkdown(state: EvaluationState): string {
  return [
    "# Canonical normalized result",
    "",
    `Evaluated at: \`${markdownValue(state.evaluatedAt)}\``,
    "",
    "The JSON below is the evaluator-produced normalized result. Canonical strings and identifiers are preserved; use `/off/normalized` for the JSON export response.",
    "",
    "```json",
    JSON.stringify(normalized(state), null, 2).replaceAll("```", "`\\`\\`"),
    "```",
  ].join("\n");
}

export function headlineOutputs(state: EvaluationState, api: OffApi): Record<string, unknown>[] {
  const normalized = requireNormalized(state);
  if (normalized === undefined) return [];
  const entities = publicEntities(normalized, api);
  const units = unitIndex(entities);
  const scenarios = entityIndex(entities, "scenarios");
  const attestations = entityIndex(entities, "attestations");
  const freshness = new Map(records(normalized.freshness?.headlines).map((row) => [String(row.entityId), row]));
  return records(entities.outputs)
    .filter((output) => output.headline === true)
    .map((output) => {
      const scenario = typeof output.scenarioId === "string" ? scenarios.get(output.scenarioId) : undefined;
      const attestation = typeof output.attestationId === "string" ? attestations.get(output.attestationId) : undefined;
      const fresh = freshness.get(String(output.id));
      return timed(state, {
        id: output.id,
        label: output.label ?? null,
        ...valueFields(output),
        ...unitFields(output, units),
        scenario_id: output.scenarioId ?? null,
        scenario: scenario?.label ?? null,
        as_of_date: output.asOfDate ?? null,
        methodology: output.methodology ?? null,
        attestation_id: output.attestationId ?? null,
        attestation: attestation ?? null,
        freshness_status: fresh?.status ?? "unknown",
        stale_dependency_ids: Array.isArray(fresh?.staleDependencyIds) ? fresh.staleDependencyIds : [],
      });
    });
}

export function assumptions(state: EvaluationState, api: OffApi): Record<string, unknown>[] {
  const normalized = requireNormalized(state);
  if (normalized === undefined) return [];
  const entities = publicEntities(normalized, api);
  const units = unitIndex(entities);
  const freshness = new Map(records(normalized.freshness?.leaves).map((row) => [String(row.entityId), row]));
  return records(entities.assumptions).map((item) => timed(state, {
    id: item.id,
    label: item.label ?? null,
    ...valueFields(item),
    ...unitFields(item, units),
    scenario_ids: Array.isArray(item.scenarioIds) ? item.scenarioIds : [],
    designation: item.designation ?? null,
    effective_date: item.effectiveDate ?? null,
    review_by: item.reviewBy ?? null,
    freshness_status: freshness.get(String(item.id))?.status ?? "unknown",
  }));
}

export function sourceFacts(state: EvaluationState, api: OffApi): Record<string, unknown>[] {
  const normalized = requireNormalized(state);
  if (normalized === undefined) return [];
  const entities = publicEntities(normalized, api);
  const units = unitIndex(entities);
  const sources = entityIndex(entities, "sources");
  const freshness = new Map(records(normalized.freshness?.leaves).map((row) => [String(row.entityId), row]));
  return records(entities.sourceFacts).map((item) => timed(state, {
    id: item.id,
    label: item.label ?? null,
    ...valueFields(item),
    ...unitFields(item, units),
    effective_date: item.effectiveDate ?? null,
    stale_at: item.staleAt ?? null,
    source_id: item.sourceId ?? null,
    source: typeof item.sourceId === "string" ? sources.get(item.sourceId) ?? null : null,
    freshness_status: freshness.get(String(item.id))?.status ?? "unknown",
  }));
}

export function sources(state: EvaluationState, api: OffApi): Record<string, unknown>[] {
  const normalized = requireNormalized(state);
  if (normalized === undefined) return [];
  const entities = publicEntities(normalized, api);
  const resources = new Map(records(normalized.resourceInventory).map((item) => [String(item.id), item]));
  return records(entities.sources).map((item) => timed(state, {
    id: item.id,
    title: item.title ?? null,
    publisher: item.publisher ?? null,
    url: item.url ?? null,
    evidence_resource_id: item.evidenceResourceId ?? null,
    evidence_resource: typeof item.evidenceResourceId === "string" ? resources.get(item.evidenceResourceId) ?? null : null,
  }));
}

export function freshness(state: EvaluationState): Record<string, unknown>[] {
  const normalized = requireNormalized(state);
  if (normalized === undefined) return [];
  return [
    ...records(normalized.freshness?.leaves).map((row) => timed(state, { kind: "leaf", ...row })),
    ...records(normalized.freshness?.headlines).map((row) => timed(state, { kind: "headline", ...row })),
  ];
}

export function lineage(state: EvaluationState): Record<string, unknown>[] {
  const normalized = requireNormalized(state);
  return normalized === undefined ? [] : records(normalized.resolvedLineage).map((row) => timed(state, row));
}

export function diagnostics(state: EvaluationState): Record<string, unknown>[] {
  if (state.result.kind === "evaluatorFailure") {
    return [timed(state, {
      code: state.result.code,
      severity: "error",
      rule: null,
      instance_location: null,
      entity_id: null,
      parameters: { operation: state.result.operation },
    })];
  }
  return state.result.normalized.diagnostics.map((item) => timed(state, {
    code: item.code ?? null,
    severity: item.severity ?? null,
    rule: item.ruleId ?? null,
    instance_location: item.instanceLocation ?? null,
    entity_id: item.entityId ?? null,
    parameters: object(item.parameters),
  }));
}

export function resources(state: EvaluationState): Record<string, unknown>[] {
  const normalized = requireNormalized(state);
  if (normalized === undefined) return [];
  return records(normalized.resourceInventory).flatMap((resource) => {
    const fileId = typeof resource.id === "string" ? resourceOpaqueId(state.record.id, resource.id) : null;
    const locations = records(resource.locations);
    return (locations.length === 0 ? [{}] : locations).map((location) => timed(state, {
      id: resource.id ?? null,
      file_id: fileId,
      media_type: resource.mediaType ?? null,
      roles: Array.isArray(resource.roles) ? resource.roles : [],
      byte_size: resource.byteSize ?? null,
      sha256: resource.sha256 ?? null,
      location_kind: location.kind ?? null,
      availability: location.availability ?? "unknown",
      integrity: location.integrity ?? "unknown",
      remote_url: location.kind === "remote" ? location.url ?? null : null,
      local_file_exposed: location.kind === "local" && location.availability === "available" && location.integrity === "verified",
    }));
  });
}

export function workbookBindings(state: EvaluationState, api: OffApi): Record<string, unknown>[] {
  const normalized = requireNormalized(state);
  if (normalized === undefined) return [];
  const entities = workbookEntities(normalized, api);
  const workbooks = entityIndex(entities, "workbooks");
  const subjects = entityIndex(entities, "subjects");
  const unevaluated = object(entities.unevaluated);
  return records(entities.bindings).map((binding) => timed(state, {
    id: binding.id,
    subject_id: binding.subjectId ?? null,
    subject: typeof binding.subjectId === "string" ? subjects.get(binding.subjectId) ?? null : null,
    workbook_id: binding.workbookId ?? null,
    workbook: typeof binding.workbookId === "string" ? workbooks.get(binding.workbookId) ?? null : null,
    locator: object(binding.locator),
    role: binding.role ?? null,
    status: binding.status ?? "notEvaluated",
    unevaluated,
  }));
}

export function normalized(state: EvaluationState): unknown {
  return state.result.kind === "packageResult"
    ? state.result.normalized
    : {
        evaluationContext: { evaluatedAt: state.evaluatedAt, requestedProfiles: state.requestedProfiles },
        outcome: "evaluatorFailure",
        failure: { code: state.result.code, operation: state.result.operation },
      };
}
