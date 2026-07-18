import {
  Ajv2020,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";

import coreSchema from "../schemas/off-core-0.1.schema.json" with { type: "json" };
import diagnosticSchema from "../schemas/diagnostic-0.1.schema.json" with { type: "json" };
import normalizedResultSchema from "../schemas/normalized-result-0.1.schema.json" with { type: "json" };
import publicEquitySchema from "../schemas/profiles/public-equity-research-0.1.schema.json" with { type: "json" };
import { OFF_VERSION } from "./constants.ts";
import {
  createDiagnostic,
  finalizeDiagnostics,
  getRuleDefinition,
  type Diagnostic,
} from "./diagnostics.ts";
import {
  isAbsoluteUri,
  isHttpsUrlWithoutUserInfo,
} from "./uri.ts";
import { validateLocalPath } from "./resources.ts";

export { isAbsoluteUri, isHttpsUrlWithoutUserInfo } from "./uri.ts";

export const OFF_SCHEMA_IDS = {
  core: "https://openfinanceformat.org/schemas/off-core-0.1.schema.json",
  publicEquity:
    "https://openfinanceformat.org/schemas/profiles/public-equity-research-0.1.schema.json",
  normalizedResult:
    "https://openfinanceformat.org/schemas/normalized-result-0.1.schema.json",
  diagnostic:
    "https://openfinanceformat.org/schemas/diagnostic-0.1.schema.json",
} as const;

const PUBLIC_EQUITY_PROFILE_URI =
  "https://openfinanceformat.org/profiles/public-equity-research/0.1";

export interface SchemaValidationResult {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

export interface CoreSchemaEvaluationResult extends SchemaValidationResult {
  readonly rootShapeFailed: boolean;
}

const ajv = new Ajv2020({
  strict: true,
  allErrors: true,
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
  validateFormats: false,
  allowUnionTypes: false,
});

for (const schema of [
  coreSchema,
  diagnosticSchema,
  publicEquitySchema,
  normalizedResultSchema,
]) {
  ajv.addSchema(schema);
}

function requiredValidator(id: string): ValidateFunction {
  const validator = ajv.getSchema(id);
  if (validator === undefined) {
    throw new Error(`Bundled OFF schema is missing from the synchronous graph: ${id}`);
  }
  return validator;
}

const coreValidator = requiredValidator(OFF_SCHEMA_IDS.core);
const publicEquityValidator = requiredValidator(OFF_SCHEMA_IDS.publicEquity);
const normalizedResultValidator = requiredValidator(OFF_SCHEMA_IDS.normalizedResult);
const diagnosticValidator = requiredValidator(OFF_SCHEMA_IDS.diagnostic);

function pointerEscape(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function childPointer(base: string, member: string): string {
  return `${base}/${pointerEscape(member)}`;
}

function keywordLocation(error: ErrorObject): string {
  if (error.keyword === "additionalProperties") {
    return childPointer(error.instancePath, String(error.params.additionalProperty));
  }
  if (error.keyword === "unevaluatedProperties") {
    return childPointer(error.instancePath, String(error.params.unevaluatedProperty));
  }
  if (error.keyword === "propertyNames") {
    return childPointer(error.instancePath, String(error.params.propertyName));
  }
  if (error.keyword === "required") {
    const missing = String(error.params.missingProperty);
    return childPointer(error.instancePath, missing);
  }
  return error.instancePath;
}

const SCHEMA_CONSTRAINT_TOKENS: Readonly<Record<string, string>> = {
  additionalProperties: "closedObject",
  anyOf: "atLeastOne",
  const: "constant",
  contains: "contains",
  enum: "enumeration",
  if: "conditional",
  maxContains: "atMostOne",
  maximum: "numericRange",
  minContains: "contains",
  minItems: "nonEmptyArray",
  minLength: "nonEmpty",
  minProperties: "nonEmptyObject",
  minimum: "numericRange",
  not: "forbidden",
  oneOf: "union",
  pattern: "lexicalPattern",
  propertyNames: "propertyName",
  required: "required",
  type: "type",
  unevaluatedProperties: "closedObject",
  uniqueItems: "uniqueItems",
};

function schemaConstraintToken(error: ErrorObject): string {
  return SCHEMA_CONSTRAINT_TOKENS[error.keyword] ?? "schemaConstraint";
}

function profileUriForError(error: ErrorObject, value: unknown): string {
  const segments = error.instancePath.split("/").slice(1);
  if (segments[0] === "profiles" && segments[1] !== undefined) {
    const profiles =
      typeof value === "object" && value !== null && Array.isArray((value as { profiles?: unknown }).profiles)
        ? (value as { profiles: unknown[] }).profiles
        : [];
    return typeof profiles[Number(segments[1])] === "string"
      ? String(profiles[Number(segments[1])])
      : "";
  }
  if (segments[0] === "profileData" && segments[1] !== undefined) {
    return segments[1].replaceAll("~1", "/").replaceAll("~0", "~");
  }
  if (
    segments[0] === "profileData" &&
    error.keyword === "required" &&
    typeof error.params.missingProperty === "string"
  ) {
    return error.params.missingProperty;
  }
  if (
    segments[0] === "profiles" &&
    (error.keyword === "contains" || error.schemaPath.includes("/contains"))
  ) {
    return PUBLIC_EQUITY_PROFILE_URI;
  }
  return "";
}

function schemaRuleForError(error: ErrorObject): string {
  const location = keywordLocation(error);
  if (
    location === "/offVersion" ||
    (error.keyword === "required" && error.params.missingProperty === "offVersion")
  ) {
    return "OFF.SCHEMA.VERSION";
  }
  if (location === "/package" || location.startsWith("/package/")) {
    return "OFF.SCHEMA.IDENTITY";
  }
  if (
    location === "/profiles" ||
    location.startsWith("/profiles/") ||
    location === "/profileData" ||
    (location.startsWith("/profileData/") && location.split("/").length <= 3)
  ) {
    return "OFF.SCHEMA.PROFILE_DECLARATION";
  }
  if (location === "/extensions" || location.startsWith("/extensions/")) {
    return "OFF.SCHEMA.EXTENSION_NAMESPACE";
  }
  return "OFF.SCHEMA.ROOT";
}

function diagnosticFromSchemaError(
  error: ErrorObject,
  value: unknown,
): Diagnostic {
  const ruleId = schemaRuleForError(error);
  const location = keywordLocation(error);
  const token = schemaConstraintToken(error);
  switch (ruleId) {
    case "OFF.SCHEMA.VERSION":
      return createDiagnostic(ruleId, "/offVersion", {
        supportedVersion: OFF_VERSION,
      });
    case "OFF.SCHEMA.IDENTITY": {
      const field =
        location === "/package"
          ? "package"
          : location.slice("/package/".length).split("/")[0] ?? "package";
      return createDiagnostic(ruleId, location, {
        field,
        reason: token,
      });
    }
    case "OFF.SCHEMA.PROFILE_DECLARATION":
      return createDiagnostic(ruleId, location, {
        profileUri: profileUriForError(error, value),
        reason: token,
      });
    case "OFF.SCHEMA.EXTENSION_NAMESPACE": {
      const namespace =
        location.startsWith("/extensions/")
          ? location.slice("/extensions/".length).replaceAll("~1", "/").replaceAll("~0", "~")
          : "";
      return createDiagnostic(ruleId, location, {
        namespace,
        reason: token,
      });
    }
    default:
      return createDiagnostic("OFF.SCHEMA.ROOT", location, {
        constraint: token,
      });
  }
}

interface SchemaDiagnosticBatch {
  readonly diagnostics: Diagnostic[];
  readonly rootShapeFailed: boolean;
}

function isTrueRootShapeFailure(
  error: ErrorObject,
  diagnostic: Diagnostic,
): boolean {
  return (
    error.instancePath === "" &&
    diagnostic.ruleId === "OFF.SCHEMA.ROOT" &&
    (error.keyword === "type" ||
      error.keyword === "required" ||
      error.keyword === "additionalProperties" ||
      error.keyword === "unevaluatedProperties")
  );
}

function schemaDiagnostics(
  validator: ValidateFunction,
  value: unknown,
): SchemaDiagnosticBatch {
  const valid = validator(value);
  if (valid) {
    return { diagnostics: [], rootShapeFailed: false };
  }
  const candidates = (validator.errors ?? []).map((error) => ({
    error,
    diagnostic: diagnosticFromSchemaError(error, value),
  }));
  const rootFailures = candidates.filter(({ error, diagnostic }) =>
    isTrueRootShapeFailure(error, diagnostic),
  );
  return {
    diagnostics: finalizeDiagnostics(
      (rootFailures.length > 0 ? rootFailures : candidates).map(
        ({ diagnostic }) => diagnostic,
      ),
    ),
    rootShapeFailed: rootFailures.length > 0,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRealCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
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

export function isWholeSecondUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u.exec(value);
  if (match === null || !isRealCalendarDate(match[1])) {
    return false;
  }
  return Number(match[2]) <= 23 && Number(match[3]) <= 59 && Number(match[4]) <= 59;
}

function semanticCoreDiagnostics(value: unknown): Diagnostic[] {
  if (!isObject(value)) {
    return [];
  }
  const diagnostics: Diagnostic[] = [];
  const identity = isObject(value.package) ? value.package : undefined;
  if (identity !== undefined) {
    for (const field of ["id", "releaseId", "entrypointResourceId"] as const) {
      if (field in identity && !isAbsoluteUri(identity[field])) {
        diagnostics.push(
          createDiagnostic("OFF.SCHEMA.IDENTITY", `/package/${field}`, {
            field,
            reason: "absoluteUri",
          }),
        );
      }
    }
    if ("publishedAt" in identity && !isWholeSecondUtcTimestamp(identity.publishedAt)) {
      diagnostics.push(
        createDiagnostic("OFF.SCHEMA.IDENTITY", "/package/publishedAt", {
          field: "publishedAt",
          reason: "timestamp",
        }),
      );
    }
    if ("canonicalUrl" in identity && !isHttpsUrlWithoutUserInfo(identity.canonicalUrl)) {
      diagnostics.push(
        createDiagnostic("OFF.SCHEMA.IDENTITY", "/package/canonicalUrl", {
          field: "canonicalUrl",
          reason: "httpsUrlWithoutUserInfo",
        }),
      );
    }
    if (Array.isArray(identity.authors)) {
      const authorIds = new Set<string>();
      identity.authors.forEach((author, index) => {
        if (isObject(author) && "id" in author) {
          if (!isAbsoluteUri(author.id)) {
            diagnostics.push(
              createDiagnostic("OFF.SCHEMA.IDENTITY", `/package/authors/${index}/id`, {
                field: "authors.id",
                reason: "absoluteUri",
              }),
            );
          } else if (authorIds.has(author.id)) {
            diagnostics.push(
              createDiagnostic("OFF.SCHEMA.IDENTITY", `/package/authors/${index}/id`, {
                field: "authors.id",
                reason: "duplicateId",
              }),
            );
          } else {
            authorIds.add(author.id);
          }
        }
      });
    }
    if (isObject(identity.license) && "url" in identity.license && !isHttpsUrlWithoutUserInfo(identity.license.url)) {
      diagnostics.push(
        createDiagnostic("OFF.SCHEMA.IDENTITY", "/package/license/url", {
          field: "license.url",
          reason: "httpsUrl",
        }),
      );
    }
  }

  if (Array.isArray(value.profiles)) {
    value.profiles.forEach((uri, index) => {
      if (!isAbsoluteUri(uri)) {
        diagnostics.push(
          createDiagnostic("OFF.SCHEMA.PROFILE_DECLARATION", `/profiles/${index}`, {
            profileUri: typeof uri === "string" ? uri : "",
            reason: "absoluteUri",
          }),
        );
      }
    });
  }
  if (isObject(value.profileData)) {
    for (const key of Object.keys(value.profileData)) {
      if (!isAbsoluteUri(key) || !Array.isArray(value.profiles) || !value.profiles.includes(key)) {
        diagnostics.push(
          createDiagnostic(
            "OFF.SCHEMA.PROFILE_DECLARATION",
            `/profileData/${pointerEscape(key)}`,
            { profileUri: key, reason: isAbsoluteUri(key) ? "notDeclared" : "absoluteUri" },
          ),
        );
      }
    }
  }
  if (isObject(value.extensions)) {
    for (const key of Object.keys(value.extensions)) {
      if (!isAbsoluteUri(key)) {
        diagnostics.push(
          createDiagnostic(
            "OFF.SCHEMA.EXTENSION_NAMESPACE",
            `/extensions/${pointerEscape(key)}`,
            { namespace: key, reason: "absoluteUri" },
          ),
        );
      }
    }
  }
  if (Array.isArray(value.resources)) {
    value.resources.forEach((resource, resourceIndex) => {
      if (!isObject(resource)) {
        return;
      }
      if ("id" in resource && !isAbsoluteUri(resource.id)) {
        diagnostics.push(
          createDiagnostic("OFF.SCHEMA.ROOT", `/resources/${resourceIndex}/id`, {
            constraint: "absoluteUri",
          }),
        );
      }
      if (Array.isArray(resource.locations)) {
        resource.locations.forEach((location, locationIndex) => {
          if (
            isObject(location) &&
            location.kind === "remote" &&
            !isHttpsUrlWithoutUserInfo(location.url)
          ) {
            diagnostics.push(
              createDiagnostic(
                "OFF.SCHEMA.ROOT",
                `/resources/${resourceIndex}/locations/${locationIndex}/url`,
                { constraint: "httpsUrlWithoutUserInfo" },
              ),
            );
          }
        });
      }
    });
  }
  if (Array.isArray(value.relationships)) {
    value.relationships.forEach((relationship, relationshipIndex) => {
      if (!isObject(relationship)) {
        return;
      }
      for (const field of ["fromResourceId", "toResourceId"] as const) {
        if (field in relationship && !isAbsoluteUri(relationship[field])) {
          diagnostics.push(
            rootConstraint(
              `/relationships/${relationshipIndex}/${field}`,
              "absoluteUri",
            ),
          );
        }
      }
    });
  }
  return diagnostics;
}

function rootConstraint(instanceLocation: string, constraint: string): Diagnostic {
  return createDiagnostic("OFF.SCHEMA.ROOT", instanceLocation, { constraint });
}

function publicEquityLexicalDiagnostics(
  profile: Record<string, unknown>,
  profileBase: string,
  lineageEdges: unknown,
  lineageBase = `${profileBase}/lineageEdges`,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const collectionNames = [
    "securities",
    "scenarios",
    "units",
    "sources",
    "sourceFacts",
    "assumptions",
    "outputs",
    "attestations",
  ] as const;
  for (const collection of collectionNames) {
    const entities = profile[collection];
    if (!Array.isArray(entities)) {
      continue;
    }
    entities.forEach((entity, index) => {
      if (!isObject(entity)) {
        return;
      }
      const base = `${profileBase}/${collection}/${index}`;
      if ("id" in entity && !isAbsoluteUri(entity.id)) {
        diagnostics.push(rootConstraint(`${base}/id`, "absoluteUri"));
      }
      for (const field of [
        "reportingCurrencyUnitId",
        "evidenceResourceId",
        "unitId",
        "sourceId",
        "scenarioId",
        "artifactResourceId",
        "attestationId",
        "authorId",
      ]) {
        if (field in entity && !isAbsoluteUri(entity[field])) {
          diagnostics.push(rootConstraint(`${base}/${field}`, "absoluteUri"));
        }
      }
      for (const field of ["effectiveDate", "asOfDate"]) {
        if (field in entity && !isRealCalendarDate(entity[field])) {
          diagnostics.push(rootConstraint(`${base}/${field}`, "realCalendarDate"));
        }
      }
      for (const field of ["staleAt", "reviewBy", "attestedAt"]) {
        if (field in entity && !isWholeSecondUtcTimestamp(entity[field])) {
          diagnostics.push(rootConstraint(`${base}/${field}`, "wholeSecondUtcTimestamp"));
        }
      }
      for (const field of ["scenarioIds", "outputIds"] as const) {
        const references = entity[field];
        if (!Array.isArray(references)) {
          continue;
        }
        references.forEach((reference, referenceIndex) => {
          if (!isAbsoluteUri(reference)) {
            diagnostics.push(
              rootConstraint(
                `${base}/${field}/${referenceIndex}`,
                "absoluteUri",
              ),
            );
          }
        });
      }
      if (
        collection === "sources" &&
        "canonicalUrl" in entity &&
        !isHttpsUrlWithoutUserInfo(entity.canonicalUrl)
      ) {
        diagnostics.push(rootConstraint(`${base}/canonicalUrl`, "httpsUrlWithoutUserInfo"));
      }
      if (
        isObject(entity.value) &&
        entity.value.type === "date" &&
        !isRealCalendarDate(entity.value.value)
      ) {
        diagnostics.push(rootConstraint(`${base}/value/value`, "realCalendarDate"));
      }
    });
  }
  if (Array.isArray(lineageEdges)) {
    lineageEdges.forEach((edge, edgeIndex) => {
      if (!isObject(edge)) {
        return;
      }
      for (const field of ["fromId", "toId"] as const) {
        if (field in edge && !isAbsoluteUri(edge[field])) {
          diagnostics.push(
            rootConstraint(
              `${lineageBase}/${edgeIndex}/${field}`,
              "absoluteUri",
            ),
          );
        }
      }
    });
  }
  return diagnostics;
}

function semanticPublicEquityDiagnostics(value: unknown): Diagnostic[] {
  if (!isObject(value) || !isObject(value.profileData)) {
    return [];
  }
  const profile = value.profileData[PUBLIC_EQUITY_PROFILE_URI];
  if (!isObject(profile)) {
    return [];
  }
  return publicEquityLexicalDiagnostics(
    profile,
    `/profileData/${pointerEscape(PUBLIC_EQUITY_PROFILE_URI)}`,
    profile.lineageEdges,
  );
}

function semanticDiagnosticRecord(value: unknown): boolean {
  if (!isObject(value) || typeof value.ruleId !== "string" || !isObject(value.parameters)) {
    return false;
  }
  try {
    const rule = getRuleDefinition(value.ruleId);
    const expected = createDiagnostic(
      value.ruleId,
      typeof value.instanceLocation === "string" ? value.instanceLocation : "",
      value.parameters,
      typeof value.entityId === "string" ? value.entityId : undefined,
    );
    return value.code === rule.diagnostic.code && value.severity === expected.severity;
  } catch {
    return false;
  }
}

const ASCII_TOKEN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;
const MEDIA_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u;
const NORMALIZED_PUBLIC_EQUITY_BASE =
  `/profileEntities/${pointerEscape(PUBLIC_EQUITY_PROFILE_URI)}`;
const MANIFEST_PUBLIC_EQUITY_BASE =
  `/profileData/${pointerEscape(PUBLIC_EQUITY_PROFILE_URI)}`;

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareTuples(
  left: readonly string[],
  right: readonly string[],
): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const compared = compareUtf16(left[index] ?? "", right[index] ?? "");
    if (compared !== 0) return compared;
  }
  return 0;
}

function canonicalStringSetDiagnostics(
  value: unknown,
  instanceLocation: string,
): Diagnostic[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return [];
  }
  if (new Set(value).size !== value.length) {
    return [rootConstraint(instanceLocation, "uniqueItems")];
  }
  for (let index = 1; index < value.length; index += 1) {
    if (compareUtf16(value[index - 1] ?? "", value[index] ?? "") >= 0) {
      return [rootConstraint(instanceLocation, "schemaConstraint")];
    }
  }
  return [];
}

function canonicalEntityCollectionDiagnostics(
  value: unknown,
  instanceLocation: string,
): Diagnostic[] {
  if (!Array.isArray(value)) return [];
  const ids = value.map((item) => isObject(item) ? item.id : undefined);
  if (!ids.every((id) => typeof id === "string")) return [];
  return canonicalStringSetDiagnostics(ids, instanceLocation);
}

function canonicalTupleOrderDiagnostics(
  value: unknown,
  instanceLocation: string,
  tuple: (item: Record<string, unknown>) => readonly string[],
  duplicatesForbidden = false,
): Diagnostic[] {
  if (!Array.isArray(value) || !value.every(isObject)) return [];
  const tuples = value.map(tuple);
  for (let index = 1; index < tuples.length; index += 1) {
    const compared = compareTuples(tuples[index - 1] ?? [], tuples[index] ?? []);
    if (compared > 0) {
      return [rootConstraint(instanceLocation, "schemaConstraint")];
    }
    if (duplicatesForbidden && compared === 0) {
      return [rootConstraint(instanceLocation, "uniqueItems")];
    }
  }
  return [];
}

function semanticNormalizedCoreDiagnostics(value: Record<string, unknown>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const identity = isObject(value.packageIdentity) ? value.packageIdentity : undefined;
  if (identity !== undefined) {
    for (const field of ["id", "releaseId", "entrypointResourceId"] as const) {
      if (field in identity && !isAbsoluteUri(identity[field])) {
        diagnostics.push(rootConstraint(`/packageIdentity/${field}`, "absoluteUri"));
      }
    }
    if (
      "publishedAt" in identity &&
      !isWholeSecondUtcTimestamp(identity.publishedAt)
    ) {
      diagnostics.push(
        rootConstraint("/packageIdentity/publishedAt", "wholeSecondUtcTimestamp"),
      );
    }
    if (
      "canonicalUrl" in identity &&
      !isHttpsUrlWithoutUserInfo(identity.canonicalUrl)
    ) {
      diagnostics.push(
        rootConstraint("/packageIdentity/canonicalUrl", "httpsUrlWithoutUserInfo"),
      );
    }
    if (isObject(identity.license) && "url" in identity.license) {
      if (!isHttpsUrlWithoutUserInfo(identity.license.url)) {
        diagnostics.push(rootConstraint("/packageIdentity/license/url", "httpsUrl"));
      }
    }
    if (Array.isArray(identity.authors)) {
      identity.authors.forEach((author, index) => {
        if (isObject(author) && "id" in author && !isAbsoluteUri(author.id)) {
          diagnostics.push(
            rootConstraint(`/packageIdentity/authors/${index}/id`, "absoluteUri"),
          );
        }
      });
      diagnostics.push(
        ...canonicalEntityCollectionDiagnostics(
          identity.authors,
          "/packageIdentity/authors",
        ),
      );
    }
    if (Array.isArray(identity.declaredProfiles)) {
      identity.declaredProfiles.forEach((uri, index) => {
        if (!isAbsoluteUri(uri)) {
          diagnostics.push(
            rootConstraint(
              `/packageIdentity/declaredProfiles/${index}`,
              "absoluteUri",
            ),
          );
        }
      });
      diagnostics.push(
        ...canonicalStringSetDiagnostics(
          identity.declaredProfiles,
          "/packageIdentity/declaredProfiles",
        ),
      );
    }
  }

  if (Array.isArray(value.resourceInventory)) {
    const localPaths: string[] = [];
    value.resourceInventory.forEach((resource, resourceIndex) => {
      if (!isObject(resource)) return;
      if ("id" in resource && !isAbsoluteUri(resource.id)) {
        diagnostics.push(
          rootConstraint(`/resourceInventory/${resourceIndex}/id`, "absoluteUri"),
        );
      }
      if ("mediaType" in resource && !MEDIA_TYPE.test(String(resource.mediaType))) {
        diagnostics.push(
          rootConstraint(`/resourceInventory/${resourceIndex}/mediaType`, "lexicalPattern"),
        );
      }
      if (Array.isArray(resource.roles)) {
        resource.roles.forEach((role, roleIndex) => {
          if (typeof role === "string" && !ASCII_TOKEN.test(role)) {
            diagnostics.push(
              rootConstraint(
                `/resourceInventory/${resourceIndex}/roles/${roleIndex}`,
                "lexicalPattern",
              ),
            );
          }
        });
        diagnostics.push(
          ...canonicalStringSetDiagnostics(
            resource.roles,
            `/resourceInventory/${resourceIndex}/roles`,
          ),
        );
      }
      if (Array.isArray(resource.locations)) {
        resource.locations.forEach((location, locationIndex) => {
          if (!isObject(location)) return;
          if (location.kind === "local" && typeof location.path === "string") {
            localPaths.push(location.path);
            if (validateLocalPath(location.path) !== null) {
              diagnostics.push(
                rootConstraint(
                  `/resourceInventory/${resourceIndex}/locations/${locationIndex}/path`,
                  "lexicalPattern",
                ),
              );
            }
          } else if (
            location.kind === "remote" &&
            !isHttpsUrlWithoutUserInfo(location.url)
          ) {
            diagnostics.push(
              rootConstraint(
                `/resourceInventory/${resourceIndex}/locations/${locationIndex}/url`,
                "httpsUrlWithoutUserInfo",
              ),
            );
          }
        });
        diagnostics.push(
          ...canonicalTupleOrderDiagnostics(
            resource.locations,
            `/resourceInventory/${resourceIndex}/locations`,
            (location) => [
              String(location.kind),
              String(location.path ?? location.url),
            ],
          ),
        );
      }
    });
    diagnostics.push(
      ...canonicalEntityCollectionDiagnostics(
        value.resourceInventory,
        "/resourceInventory",
      ),
    );
    const foldedPaths = localPaths.map((path) =>
      path.replace(/[A-Z]/gu, (character) => character.toLowerCase())
    );
    if (new Set(foldedPaths).size !== foldedPaths.length) {
      diagnostics.push(rootConstraint("/resourceInventory", "uniqueItems"));
    }
  }

  if (Array.isArray(value.relationshipInventory)) {
    value.relationshipInventory.forEach((relationship, index) => {
      if (!isObject(relationship)) return;
      for (const field of ["fromResourceId", "toResourceId"] as const) {
        if (field in relationship && !isAbsoluteUri(relationship[field])) {
          diagnostics.push(
            rootConstraint(
              `/relationshipInventory/${index}/${field}`,
              "absoluteUri",
            ),
          );
        }
      }
      if (
        typeof relationship.relation === "string" &&
        !ASCII_TOKEN.test(relationship.relation)
      ) {
        diagnostics.push(
          rootConstraint(
            `/relationshipInventory/${index}/relation`,
            "lexicalPattern",
          ),
        );
      }
    });
    diagnostics.push(
      ...canonicalTupleOrderDiagnostics(
        value.relationshipInventory,
        "/relationshipInventory",
        (relationship) => [
          String(relationship.fromResourceId),
          String(relationship.relation),
          String(relationship.toResourceId),
        ],
      ),
    );
  }

  if (isObject(value.extensions)) {
    for (const namespace of Object.keys(value.extensions)) {
      if (!isAbsoluteUri(namespace)) {
        diagnostics.push(
          rootConstraint(`/extensions/${pointerEscape(namespace)}`, "absoluteUri"),
        );
      }
    }
  }
  return diagnostics;
}

function semanticNormalizedPublicEquityDiagnostics(
  value: Record<string, unknown>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const profileEntities = isObject(value.profileEntities)
    ? value.profileEntities
    : undefined;
  const profile = profileEntities?.[PUBLIC_EQUITY_PROFILE_URI];
  if (isObject(profile)) {
    diagnostics.push(
      ...publicEquityLexicalDiagnostics(
        profile,
        NORMALIZED_PUBLIC_EQUITY_BASE,
        value.resolvedLineage,
        "/resolvedLineage",
      ),
    );
    const collectionNames = [
      "securities",
      "scenarios",
      "units",
      "sources",
      "sourceFacts",
      "assumptions",
      "outputs",
      "attestations",
    ] as const;
    const allIds: string[] = [];
    for (const collection of collectionNames) {
      const entities = profile[collection];
      diagnostics.push(
        ...canonicalEntityCollectionDiagnostics(
          entities,
          `${NORMALIZED_PUBLIC_EQUITY_BASE}/${collection}`,
        ),
      );
      if (!Array.isArray(entities)) continue;
      entities.forEach((entity, index) => {
        if (!isObject(entity)) return;
        if (typeof entity.id === "string") allIds.push(entity.id);
        for (const field of ["scenarioIds", "outputIds"] as const) {
          if (Array.isArray(entity[field])) {
            diagnostics.push(
              ...canonicalStringSetDiagnostics(
                entity[field],
                `${NORMALIZED_PUBLIC_EQUITY_BASE}/${collection}/${index}/${field}`,
              ),
            );
          }
        }
      });
    }
    if (new Set(allIds).size !== allIds.length) {
      diagnostics.push(rootConstraint(NORMALIZED_PUBLIC_EQUITY_BASE, "uniqueItems"));
    }
  }

  if (Array.isArray(value.resolvedLineage)) {
    diagnostics.push(
      ...canonicalTupleOrderDiagnostics(
        value.resolvedLineage,
        "/resolvedLineage",
        (edge) => [String(edge.fromId), String(edge.toId)],
        true,
      ),
    );
  }
  if (isObject(value.freshness)) {
    for (const collection of ["leaves", "headlines"] as const) {
      const entities = value.freshness[collection];
      diagnostics.push(
        ...canonicalStringSetDiagnostics(
          Array.isArray(entities) && entities.every(isObject)
            ? entities.map((entity) => entity.entityId)
            : entities,
          `/freshness/${collection}`,
        ),
      );
      if (!Array.isArray(entities)) continue;
      entities.forEach((entity, index) => {
        if (!isObject(entity)) return;
        if ("entityId" in entity && !isAbsoluteUri(entity.entityId)) {
          diagnostics.push(
            rootConstraint(
              `/freshness/${collection}/${index}/entityId`,
              "absoluteUri",
            ),
          );
        }
        if (
          collection === "leaves" &&
          "threshold" in entity &&
          !isWholeSecondUtcTimestamp(entity.threshold)
        ) {
          diagnostics.push(
            rootConstraint(
              `/freshness/${collection}/${index}/threshold`,
              "wholeSecondUtcTimestamp",
            ),
          );
        }
        if (collection === "headlines" && Array.isArray(entity.staleDependencyIds)) {
          entity.staleDependencyIds.forEach((id, idIndex) => {
            if (!isAbsoluteUri(id)) {
              diagnostics.push(
                rootConstraint(
                  `/freshness/${collection}/${index}/staleDependencyIds/${idIndex}`,
                  "absoluteUri",
                ),
              );
            }
          });
          diagnostics.push(
            ...canonicalStringSetDiagnostics(
              entity.staleDependencyIds,
              `/freshness/${collection}/${index}/staleDependencyIds`,
            ),
          );
        }
      });
    }
  }
  return diagnostics;
}

function diagnosticStage(value: Record<string, unknown>): string | undefined {
  if (typeof value.ruleId !== "string") return undefined;
  try {
    return getRuleDefinition(value.ruleId).stage;
  } catch {
    return undefined;
  }
}

function isPublicEquitySchemaDiagnostic(
  value: Record<string, unknown>,
): boolean {
  if (diagnosticStage(value) !== "schema") return false;
  const location = value.instanceLocation;
  if (typeof location !== "string") return false;
  if (
    location === "/profileData" &&
    isObject(value.parameters) &&
    value.parameters.reason === "required"
  ) {
    return true;
  }
  return location === MANIFEST_PUBLIC_EQUITY_BASE ||
    location.startsWith(`${MANIFEST_PUBLIC_EQUITY_BASE}/`);
}

function isApplicableProfileError(
  value: Record<string, unknown>,
  profileUri: string,
): boolean {
  if (value.severity !== "error") return false;
  const stage = diagnosticStage(value);
  if (stage === "request") return value.entityId === profileUri;
  return profileUri === PUBLIC_EQUITY_PROFILE_URI &&
    (stage === "publicEquity" || isPublicEquitySchemaDiagnostic(value));
}

function isTrueRootShapeDiagnostic(
  value: Record<string, unknown>,
): boolean {
  if (
    value.severity !== "error" ||
    value.ruleId !== "OFF.SCHEMA.ROOT" ||
    typeof value.instanceLocation !== "string" ||
    !isObject(value.parameters)
  ) {
    return false;
  }
  const constraint = value.parameters.constraint;
  if (constraint === "type") return value.instanceLocation === "";
  return (
    (constraint === "required" || constraint === "closedObject") &&
    value.instanceLocation.startsWith("/") &&
    !value.instanceLocation.slice(1).includes("/")
  );
}

function semanticNormalizedResultDiagnostics(value: unknown): Diagnostic[] {
  if (!isObject(value)) {
    return [];
  }
  const diagnostics: Diagnostic[] = [];
  if (
    isObject(value.evaluationContext) &&
    "evaluatedAt" in value.evaluationContext &&
    !isWholeSecondUtcTimestamp(value.evaluationContext.evaluatedAt)
  ) {
    diagnostics.push(rootConstraint("/evaluationContext/evaluatedAt", "wholeSecondUtcTimestamp"));
  }
  if (isObject(value.evaluationContext) && Array.isArray(value.evaluationContext.requestedProfiles)) {
    value.evaluationContext.requestedProfiles.forEach((uri, index) => {
      if (!isAbsoluteUri(uri)) {
        diagnostics.push(rootConstraint(`/evaluationContext/requestedProfiles/${index}`, "absoluteUri"));
      }
    });
    diagnostics.push(
      ...canonicalStringSetDiagnostics(
        value.evaluationContext.requestedProfiles,
        "/evaluationContext/requestedProfiles",
      ),
    );
  }
  if (Array.isArray(value.diagnostics)) {
    value.diagnostics.forEach((diagnostic, index) => {
      if (!semanticDiagnosticRecord(diagnostic)) {
        diagnostics.push(rootConstraint(`/diagnostics/${index}`, "diagnosticRegistry"));
      }
    });
    if (value.diagnostics.every(semanticDiagnosticRecord)) {
      const canonicalDiagnostics = finalizeDiagnostics(
        value.diagnostics as readonly Diagnostic[],
      );
      if (JSON.stringify(canonicalDiagnostics) !== JSON.stringify(value.diagnostics)) {
        diagnostics.push(rootConstraint("/diagnostics", "schemaConstraint"));
      }
    }
  }

  diagnostics.push(
    ...semanticNormalizedCoreDiagnostics(value),
    ...semanticNormalizedPublicEquityDiagnostics(value),
  );

  const packageDiagnostics = Array.isArray(value.diagnostics)
    ? value.diagnostics.filter(isObject)
    : [];
  const requestPrerequisitePassed = !packageDiagnostics.some(
    isTrueRootShapeDiagnostic,
  );
  const hasError = packageDiagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  );
  const hasWarning = packageDiagnostics.some(
    (diagnostic) => diagnostic.severity === "warning",
  );
  const expectedOutcome = hasError
    ? "invalid"
    : hasWarning
      ? "validWithWarnings"
      : "valid";
  if (value.outcome !== expectedOutcome) {
    diagnostics.push(
      rootConstraint("/outcome", "outcomeDiagnosticSeverityMismatch"),
    );
  }

  const profileResults = isObject(value.profileResults)
    ? value.profileResults
    : undefined;
  const core =
    profileResults !== undefined && isObject(profileResults.core)
      ? profileResults.core
      : undefined;
  const profileRows =
    profileResults !== undefined && Array.isArray(profileResults.declared)
      ? profileResults.declared.filter(isObject)
      : [];
  const coreBlockingError = packageDiagnostics.some((diagnostic) => {
    if (diagnostic.severity !== "error") return false;
    const stage = diagnosticStage(diagnostic);
    return stage === "admission" ||
      stage === "core" ||
      (stage === "schema" && !isPublicEquitySchemaDiagnostic(diagnostic));
  });
  if (core?.status === "failed" && !coreBlockingError) {
    diagnostics.push(
      rootConstraint("/profileResults/core/status", "failedStatusRequiresError"),
    );
  }
  if (core?.status === "passed" && coreBlockingError) {
    diagnostics.push(
      rootConstraint("/profileResults/core/status", "schemaConstraint"),
    );
  }

  const hasPackageIdentity = Object.hasOwn(value, "packageIdentity");
  const hasResourceInventory = Object.hasOwn(value, "resourceInventory");
  const hasExtensions = Object.hasOwn(value, "extensions");
  const retainedCoreMemberCount = [
    hasPackageIdentity,
    hasResourceInventory,
    hasExtensions,
  ].filter(Boolean).length;
  const hasRetainedCore = retainedCoreMemberCount === 3;
  if (retainedCoreMemberCount !== 0 && !hasRetainedCore) {
    diagnostics.push(rootConstraint("", "coreRetentionGroup"));
  }

  const hasRelationships = Object.hasOwn(value, "relationshipInventory");
  const hasProfileEntities = Object.hasOwn(value, "profileEntities");
  const hasResolvedLineage = Object.hasOwn(value, "resolvedLineage");
  const hasFreshness = Object.hasOwn(value, "freshness");
  if (core?.status === "passed" && (!hasRetainedCore || !hasRelationships)) {
    diagnostics.push(
      rootConstraint("/profileResults/core/status", "corePassedRetention"),
    );
  }
  if (hasRelationships && (!hasRetainedCore || core?.status !== "passed")) {
    diagnostics.push(
      rootConstraint("/relationshipInventory", "relationshipRetention"),
    );
  }
  if (hasProfileEntities && (!hasRelationships || core?.status !== "passed")) {
    diagnostics.push(
      rootConstraint("/profileEntities", "profileEntityRetention"),
    );
  }
  if (hasResolvedLineage && !hasProfileEntities) {
    diagnostics.push(
      rootConstraint("/resolvedLineage", "lineageRequiresEntities"),
    );
  }
  if (hasFreshness && (!hasResolvedLineage || !hasProfileEntities)) {
    diagnostics.push(
      rootConstraint("/freshness", "freshnessRequiresLineage"),
    );
  }

  let publicEquityRow: Record<string, unknown> | undefined;
  profileRows.forEach((row, index) => {
    const uri = row.uri;
    const isPublicEquity = uri === PUBLIC_EQUITY_PROFILE_URI;
    if (isPublicEquity) {
      publicEquityRow = row;
    }
    const hasClaim = [
      "claim",
      "structuralConformance",
      "lineageCompleteness",
    ].some((member) => Object.hasOwn(row, member));
    const isPassedPublicEquity = isPublicEquity && row.status === "passed";
    const hasApplicableError = typeof uri === "string" && row.requested === true &&
      packageDiagnostics.some((diagnostic) =>
        isApplicableProfileError(diagnostic, uri)
      );
    if ("uri" in row && !isAbsoluteUri(row.uri)) {
      diagnostics.push(
        rootConstraint(`/profileResults/declared/${index}/uri`, "absoluteUri"),
      );
    }
    if (row.requested === false && row.status !== "notEvaluated") {
      diagnostics.push(
        rootConstraint(`/profileResults/declared/${index}/status`, "schemaConstraint"),
      );
    }
    if (row.requested === true && hasApplicableError && row.status !== "failed") {
      diagnostics.push(
        rootConstraint(`/profileResults/declared/${index}/status`, "schemaConstraint"),
      );
    }
    if (row.requested === true && !hasApplicableError && row.status === "failed") {
      diagnostics.push(
        rootConstraint(
          `/profileResults/declared/${index}/status`,
          "failedStatusRequiresError",
        ),
      );
    }
    if (
      row.requested === true &&
      !isPublicEquity &&
      requestPrerequisitePassed &&
      !hasApplicableError &&
      row.status === "notEvaluated"
    ) {
      diagnostics.push(
        rootConstraint(
          `/profileResults/declared/${index}/status`,
          "schemaConstraint",
        ),
      );
    }
    if (row.status === "passed" && !isPublicEquity) {
      diagnostics.push(
        rootConstraint(
          `/profileResults/declared/${index}/status`,
          "unsupportedProfilePassed",
        ),
      );
    }
    if (hasClaim && !isPassedPublicEquity) {
      diagnostics.push(
        rootConstraint(
          `/profileResults/declared/${index}`,
          "profileClaimStatus",
        ),
      );
    }
    if (
      isPassedPublicEquity &&
      (!Object.hasOwn(row, "claim") ||
        !Object.hasOwn(row, "structuralConformance") ||
        !Object.hasOwn(row, "lineageCompleteness"))
    ) {
      diagnostics.push(
        rootConstraint(
          `/profileResults/declared/${index}`,
          "profileClaimRequired",
        ),
      );
    }
  });
  diagnostics.push(
    ...canonicalStringSetDiagnostics(
      profileRows.map((row) => row.uri),
      "/profileResults/declared",
    ),
  );
  if (
    hasResolvedLineage &&
    publicEquityRow?.status !== "passed"
  ) {
    diagnostics.push(
      rootConstraint("/resolvedLineage", "lineageRequiresPassedProfile"),
    );
  }
  if (
    publicEquityRow?.status === "passed" &&
    (!hasProfileEntities || !hasResolvedLineage)
  ) {
    const rowIndex = profileRows.indexOf(publicEquityRow);
    diagnostics.push(
      rootConstraint(
        `/profileResults/declared/${rowIndex}/status`,
        "profilePassedRetention",
      ),
    );
  }
  if (
    hasProfileEntities &&
    !hasResolvedLineage &&
    publicEquityRow?.status !== "failed"
  ) {
    diagnostics.push(
      rootConstraint("/profileEntities", "failedGraphProfileStatus"),
    );
  }
  const hasPublicEquityGraphError = packageDiagnostics.some(
    (diagnostic) =>
      diagnostic.severity === "error" &&
      diagnosticStage(diagnostic) === "publicEquity",
  );
  if (hasPublicEquityGraphError && !hasProfileEntities) {
    diagnostics.push(
      rootConstraint("/profileEntities", "failedGraphProfileStatus"),
    );
  }

  if (isObject(value.packageIdentity)) {
    const requested =
      isObject(value.evaluationContext) &&
      Array.isArray(value.evaluationContext.requestedProfiles)
        ? value.evaluationContext.requestedProfiles.filter(
            (uri): uri is string => typeof uri === "string",
          )
        : [];
    const declared = Array.isArray(value.packageIdentity.declaredProfiles)
      ? value.packageIdentity.declaredProfiles.filter(
          (uri): uri is string => typeof uri === "string",
        )
      : [];
    const expectedUris = [...new Set([...declared, ...requested])].sort();
    const actualUris = profileRows
      .map((row) => row.uri)
      .filter((uri): uri is string => typeof uri === "string");
    const uniqueActualUris = [...new Set(actualUris)].sort();
    const flagsMatch = profileRows.every(
      (row) =>
        typeof row.uri === "string" &&
        row.requested === requested.includes(row.uri),
    );
    if (
      actualUris.length !== uniqueActualUris.length ||
      JSON.stringify(uniqueActualUris) !== JSON.stringify(expectedUris) ||
      !flagsMatch
    ) {
      diagnostics.push(
        rootConstraint("/profileResults/declared", "profileRowUnion"),
      );
    }
  }

  const hasAdmissionFailure = packageDiagnostics.some(
    (diagnostic) =>
      typeof diagnostic.ruleId === "string" &&
      diagnostic.ruleId.startsWith("OFF.ADMISSION."),
  );
  if (hasAdmissionFailure && profileRows.length > 0) {
    diagnostics.push(
      rootConstraint("/profileResults/declared", "admissionProfileRows"),
    );
  }
  return diagnostics;
}

function result(diagnostics: readonly Diagnostic[]): SchemaValidationResult {
  const finalized = finalizeDiagnostics(diagnostics);
  return { valid: finalized.length === 0, diagnostics: finalized };
}

export function validateCoreSchemaForEvaluation(
  value: unknown,
): CoreSchemaEvaluationResult {
  const schema = schemaDiagnostics(coreValidator, value);
  const validation = result(
    schema.rootShapeFailed
      ? schema.diagnostics
      : [...schema.diagnostics, ...semanticCoreDiagnostics(value)],
  );
  return { ...validation, rootShapeFailed: schema.rootShapeFailed };
}

export function validateCoreSchema(value: unknown): SchemaValidationResult {
  const { valid, diagnostics } = validateCoreSchemaForEvaluation(value);
  return { valid, diagnostics };
}

export function validatePublicEquitySchema(value: unknown): SchemaValidationResult {
  const schema = schemaDiagnostics(publicEquityValidator, value);
  if (schema.rootShapeFailed) {
    return result(schema.diagnostics);
  }
  return result([
    ...schema.diagnostics,
    ...semanticCoreDiagnostics(value),
    ...semanticPublicEquityDiagnostics(value),
  ]);
}

export function validateNormalizedResultSchema(value: unknown): SchemaValidationResult {
  const schema = schemaDiagnostics(normalizedResultValidator, value);
  if (schema.rootShapeFailed) {
    return result(schema.diagnostics);
  }
  return result([
    ...schema.diagnostics,
    ...semanticNormalizedResultDiagnostics(value),
  ]);
}

export function validateDiagnosticSchema(value: unknown): SchemaValidationResult {
  const schema = schemaDiagnostics(diagnosticValidator, value);
  if (schema.rootShapeFailed) {
    return result(schema.diagnostics);
  }
  const diagnostics = [...schema.diagnostics];
  if (diagnostics.length === 0 && !semanticDiagnosticRecord(value)) {
    diagnostics.push(rootConstraint("", "diagnosticRegistry"));
  }
  return result(diagnostics);
}
