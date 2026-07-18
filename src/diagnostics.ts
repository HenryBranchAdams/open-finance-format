import rulesDocument from "../spec/rules-0.1.json" with { type: "json" };
import { cloneAndDeepFreezeJson } from "./immutable.ts";
import { canonicalizeJson, canonicalizeJsonText } from "./json/jcs.ts";

export type DiagnosticSeverity = "error" | "warning";
export type PackageOutcome = "valid" | "validWithWarnings" | "invalid";

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly instanceLocation: string;
  readonly entityId?: string;
  readonly ruleId: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

interface RuleEmission {
  readonly cardinality:
    | "onePerEvaluation"
    | "onePerInstanceLocation"
    | "onePerEntity"
    | "onePerEdge"
    | "onePerRemoteLocation"
    | "onePerAffectedHeadline";
  readonly instanceLocationRule: string;
  readonly entityIdRule: string;
  readonly requiredParameterKeys: readonly string[];
}

interface RuleDefinition {
  readonly id: string;
  readonly stage: string;
  readonly prerequisites: readonly string[];
  readonly diagnostic: {
    readonly code: string;
    readonly severity: DiagnosticSeverity;
  };
  readonly emission: RuleEmission;
}

interface RuleRegistryDocument {
  readonly registryVersion: string;
  readonly offVersion: string;
  readonly rules: readonly RuleDefinition[];
}

const registry = rulesDocument as RuleRegistryDocument;
const rulesById = new Map<string, RuleDefinition>();

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

for (const rule of registry.rules) {
  if (rulesById.has(rule.id)) {
    throw new Error(`Duplicate OFF rule registry id: ${rule.id}`);
  }
  rulesById.set(rule.id, rule);
}

function sortedParameterObject(
  parameters: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return cloneAndDeepFreezeJson(
    Object.fromEntries(
      Object.entries(parameters).sort(([left], [right]) => compareUtf16(left, right)),
    ),
  );
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const sharedLength = Math.min(left.byteLength, right.byteLength);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftByte = left[index] ?? 0;
    const rightByte = right[index] ?? 0;
    if (leftByte !== rightByte) {
      return leftByte - rightByte;
    }
  }
  return left.byteLength - right.byteLength;
}

export function getRuleDefinition(ruleId: string): RuleDefinition {
  const rule = rulesById.get(ruleId);
  if (rule === undefined) {
    throw new RangeError(`Unknown OFF rule id: ${ruleId}`);
  }
  return rule;
}

export function createDiagnostic(
  ruleId: string,
  instanceLocation: string,
  parameters: Readonly<Record<string, unknown>>,
  entityId?: string,
): Diagnostic {
  const rule = getRuleDefinition(ruleId);
  const expectedKeys = [...rule.emission.requiredParameterKeys].sort();
  const actualKeys = Object.keys(parameters).sort();
  const missingKeys = expectedKeys.filter((key) => !actualKeys.includes(key));
  const extraKeys = actualKeys.filter((key) => !expectedKeys.includes(key));
  if (missingKeys.length > 0) {
    throw new TypeError(
      `${ruleId} diagnostic is missing required parameter keys: ${missingKeys.join(", ")}`,
    );
  }
  if (extraKeys.length > 0) {
    throw new TypeError(
      `${ruleId} diagnostic contains unlisted parameter keys: ${extraKeys.join(", ")}`,
    );
  }
  const portableParameters = sortedParameterObject(parameters);

  const entityMustBeOmitted = rule.emission.entityIdRule === "omit";
  const entityMayBeOmitted = rule.emission.entityIdRule.includes("otherwise omit");
  if (entityMustBeOmitted && entityId !== undefined) {
    throw new TypeError(`${ruleId} diagnostic forbids entityId`);
  }
  if (!entityMustBeOmitted && !entityMayBeOmitted && entityId === undefined) {
    throw new TypeError(`${ruleId} diagnostic requires entityId`);
  }

  return Object.freeze({
    code: rule.diagnostic.code,
    severity: rule.diagnostic.severity,
    instanceLocation,
    ...(entityId === undefined ? {} : { entityId }),
    ruleId,
    parameters: portableParameters,
  });
}

function compareDiagnostics(left: Diagnostic, right: Diagnostic): number {
  const severityRank = (value: DiagnosticSeverity): number =>
    value === "error" ? 0 : 1;
  return (
    severityRank(left.severity) - severityRank(right.severity) ||
    compareUtf16(left.code, right.code) ||
    compareUtf16(left.instanceLocation, right.instanceLocation) ||
    compareUtf16(left.entityId ?? "", right.entityId ?? "") ||
    compareUtf16(left.ruleId, right.ruleId) ||
    compareBytes(canonicalizeJson(left.parameters), canonicalizeJson(right.parameters))
  );
}

function deduplicationKey(diagnostic: Diagnostic): string {
  const rule = getRuleDefinition(diagnostic.ruleId);
  const parameter = (name: string): string =>
    canonicalizeJsonText(diagnostic.parameters[name]);
  switch (rule.emission.cardinality) {
    case "onePerEvaluation":
      return diagnostic.ruleId;
    case "onePerInstanceLocation":
      return `${diagnostic.ruleId}\u0000${diagnostic.instanceLocation}`;
    case "onePerEntity":
    case "onePerAffectedHeadline":
      return `${diagnostic.ruleId}\u0000${diagnostic.entityId ?? ""}`;
    case "onePerRemoteLocation":
      return `${diagnostic.ruleId}\u0000${diagnostic.entityId ?? ""}\u0000${parameter("locationIndex")}`;
    case "onePerEdge": {
      const from =
        diagnostic.parameters.fromId === undefined ? "fromResourceId" : "fromId";
      const to = diagnostic.parameters.toId === undefined ? "toResourceId" : "toId";
      return `${diagnostic.ruleId}\u0000${parameter(from)}\u0000${parameter(to)}`;
    }
  }
}

export function finalizeDiagnostics(
  diagnostics: readonly Diagnostic[],
): Diagnostic[] {
  const selected = new Map<string, Diagnostic>();
  const parameterBytes = new Map<Diagnostic, Uint8Array>();
  const bytesFor = (diagnostic: Diagnostic): Uint8Array => {
    const existing = parameterBytes.get(diagnostic);
    if (existing !== undefined) return existing;
    const bytes = canonicalizeJson(diagnostic.parameters);
    parameterBytes.set(diagnostic, bytes);
    return bytes;
  };
  for (const diagnostic of diagnostics) {
    const key = deduplicationKey(diagnostic);
    const current = selected.get(key);
    if (current === undefined) {
      selected.set(key, diagnostic);
      continue;
    }
    const parameterOrder = compareBytes(bytesFor(diagnostic), bytesFor(current));
    if (
      parameterOrder < 0 ||
      (parameterOrder === 0 && compareDiagnostics(diagnostic, current) < 0)
    ) {
      selected.set(key, diagnostic);
    }
  }
  return [...selected.values()].sort(compareDiagnostics);
}

export function outcomeFromDiagnostics(
  diagnostics: readonly Pick<Diagnostic, "severity">[],
): PackageOutcome {
  if (diagnostics.some(({ severity }) => severity === "error")) {
    return "invalid";
  }
  if (diagnostics.some(({ severity }) => severity === "warning")) {
    return "validWithWarnings";
  }
  return "valid";
}

export const RULE_REGISTRY_VERSION = registry.registryVersion;
