import { constants as fsConstants, type BigIntStats } from "node:fs";
import {
  lstat,
  open,
  realpath,
} from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import { evaluatePackage, type EvaluationResult } from "./index.ts";
import { canonicalizeJson } from "./json/jcs.ts";
import type { EvaluatorFailure } from "./resources.ts";
import { isAbsoluteUri } from "./uri.ts";

export type CorpusMismatchReason =
  | "invalidCorpus"
  | "pathEscape"
  | "pathType"
  | "expectationFormat"
  | "outcomeMismatch"
  | "diagnosticMismatch"
  | "canonicalMismatch"
  | "invalidEvaluatorVector"
  | "evaluatorFailureMismatch"
  | "nondeterministic";

export type CorpusCaseResult =
  | {
      readonly id: string;
      readonly status: "passed";
      readonly outcome: "valid" | "validWithWarnings" | "invalid";
    }
  | {
      readonly id: string;
      readonly status: "mismatch";
      readonly reason: CorpusMismatchReason;
    };

export type EvaluatorFailureCaseResult =
  | {
      readonly id: string;
      readonly status: "passed";
      readonly evaluatorFailure: EvaluatorFailure;
    }
  | {
      readonly id: string;
      readonly status: "mismatch";
      readonly reason: CorpusMismatchReason;
    };

export interface CorpusResult {
  readonly kind: "corpusResult";
  readonly ok: boolean;
  readonly corpusVersion: "0.1";
  readonly cases: readonly CorpusCaseResult[];
  readonly evaluatorFailureCases: readonly EvaluatorFailureCaseResult[];
}

export type CorpusVerificationResult = CorpusResult | EvaluatorFailure;

export const MAX_CORPUS_BYTES = 1024 * 1024;
export const MAX_EVALUATOR_VECTOR_BYTES = 1024 * 1024;
export const MAX_EXPECTATION_BYTES = 16 * 1024 * 1024;
const CORPUS_READ_CHUNK_BYTES = 64 * 1024;

interface CorpusCase {
  readonly id: string;
  readonly boundary: string;
  readonly package: string;
  readonly evaluatedAt: string;
  readonly requestedProfiles: readonly string[];
  readonly expectedOutcome: "valid" | "validWithWarnings" | "invalid";
  readonly expectedDiagnosticCodes: readonly string[];
  readonly expected: string;
}

interface CorpusDocument {
  readonly corpusVersion: "0.1";
  readonly evaluatorFailures: string;
  readonly cases: readonly CorpusCase[];
}

interface EvaluatorFailureVectorCase {
  readonly id: string;
  readonly boundary: string;
  readonly package: string;
  readonly evaluatedAt: string;
  readonly requestedProfiles: readonly string[];
  readonly expected: EvaluatorFailure;
}

interface EvaluatorFailureVectorDocument {
  readonly vectorVersion: "0.1";
  readonly cases: readonly EvaluatorFailureVectorCase[];
}

interface CheckedReference {
  readonly path: string;
  readonly identity: BigIntStats;
}

type CheckedReferenceResult =
  | CheckedReference
  | CorpusMismatchReason
  | EvaluatorFailure;

type BoundedReadResult =
  | { readonly kind: "bytes"; readonly bytes: Uint8Array }
  | EvaluatorFailure;

const corpusKeys = ["cases", "corpusVersion", "evaluatorFailures"];
const caseKeys = [
  "boundary",
  "evaluatedAt",
  "expected",
  "expectedDiagnosticCodes",
  "expectedOutcome",
  "id",
  "package",
  "requestedProfiles",
];
const evaluatorVectorKeys = ["cases", "vectorVersion"];
const evaluatorVectorCaseKeys = [
  "boundary",
  "evaluatedAt",
  "expected",
  "id",
  "package",
  "requestedProfiles",
];
const evaluatorFailureKeys = new Set([
  "code",
  "kind",
  "operation",
  "path",
  "resourceId",
]);
const evaluatorFailureOperations: Readonly<
  Record<EvaluatorFailure["code"], readonly EvaluatorFailure["operation"][]>
> = {
  "OFF-T1001": ["resourceLimit"],
  "OFF-T1002": [
    "rootAccess",
    "directoryRead",
    "resourceStat",
    "resourceOpen",
    "resourceRead",
    "resourceClose",
  ],
  "OFF-T1003": ["resourceMutation"],
  "OFF-T1004": ["configuration", "internal"],
};

function sameIdentity(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs;
}

function evaluatorFailure(
  code: EvaluatorFailure["code"],
  operation: EvaluatorFailure["operation"],
): EvaluatorFailure {
  return { kind: "evaluatorFailure", code, operation };
}

function errno(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined;
}

function isMissingPathError(error: unknown): boolean {
  return ["ENOENT", "ENOTDIR"].includes(errno(error) ?? "");
}

async function boundedStableRead(
  path: string,
  identity: BigIntStats,
  maximumBytes: number,
): Promise<BoundedReadResult> {
  if (identity.size > BigInt(maximumBytes)) {
    return evaluatorFailure("OFF-T1001", "resourceLimit");
  }
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(
      path,
      fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
    );
  } catch {
    return evaluatorFailure("OFF-T1002", "resourceOpen");
  }

  let result: BoundedReadResult;
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || !sameIdentity(identity, before)) {
      result = evaluatorFailure("OFF-T1003", "resourceMutation");
    } else {
      const length = Number(before.size);
      const bytes = new Uint8Array(length);
      let offset = 0;
      let readFailure: EvaluatorFailure | undefined;
      while (offset < length) {
        const chunkLength = Math.min(CORPUS_READ_CHUNK_BYTES, length - offset);
        try {
          const { bytesRead } = await handle.read(
            bytes,
            offset,
            chunkLength,
            offset,
          );
          if (bytesRead === 0) break;
          offset += bytesRead;
        } catch {
          readFailure = evaluatorFailure("OFF-T1002", "resourceRead");
          break;
        }
      }
      if (readFailure !== undefined) {
        result = readFailure;
      } else if (offset !== length) {
        result = evaluatorFailure("OFF-T1003", "resourceMutation");
      } else {
        const after = await handle.stat({ bigint: true });
        let pathAfter: BigIntStats | undefined;
        let statFailure: EvaluatorFailure | undefined;
        try {
          pathAfter = await lstat(path, { bigint: true });
        } catch (error) {
          statFailure = ["ENOENT", "ENOTDIR"].includes(errno(error) ?? "")
            ? evaluatorFailure("OFF-T1003", "resourceMutation")
            : evaluatorFailure("OFF-T1002", "resourceStat");
        }
        if (statFailure !== undefined) {
          result = statFailure;
        } else if (
          pathAfter !== undefined &&
          sameIdentity(before, after) &&
          sameIdentity(before, pathAfter)
        ) {
          result = { kind: "bytes", bytes };
        } else {
          result = evaluatorFailure("OFF-T1003", "resourceMutation");
        }
      }
    }
  } catch {
    result = evaluatorFailure("OFF-T1002", "resourceStat");
  }
  try {
    await handle.close();
  } catch {
    return evaluatorFailure("OFF-T1002", "resourceClose");
  }
  return result;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify(keys);
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

function parseCorpus(value: unknown): CorpusDocument | undefined {
  if (!isObject(value) || !exactKeys(value, corpusKeys)) return undefined;
  if (
    value.corpusVersion !== "0.1" ||
    typeof value.evaluatorFailures !== "string" ||
    !Array.isArray(value.cases) ||
    value.cases.length === 0
  ) {
    return undefined;
  }
  const ids = new Set<string>();
  const cases: CorpusCase[] = [];
  for (const candidate of value.cases) {
    if (!isObject(candidate) || !exactKeys(candidate, caseKeys)) return undefined;
    if (
      typeof candidate.id !== "string" ||
      candidate.id.length === 0 ||
      ids.has(candidate.id) ||
      typeof candidate.boundary !== "string" ||
      candidate.boundary.length === 0 ||
      typeof candidate.package !== "string" ||
      typeof candidate.evaluatedAt !== "string" ||
      !isWholeSecondUtcTimestamp(candidate.evaluatedAt) ||
      !Array.isArray(candidate.requestedProfiles) ||
      !candidate.requestedProfiles.every(
        (profile): profile is string =>
          typeof profile === "string" && isAbsoluteUri(profile),
      ) ||
      new Set(candidate.requestedProfiles).size !== candidate.requestedProfiles.length ||
      !["valid", "validWithWarnings", "invalid"].includes(
        String(candidate.expectedOutcome),
      ) ||
      !Array.isArray(candidate.expectedDiagnosticCodes) ||
      !candidate.expectedDiagnosticCodes.every(
        (code): code is string =>
          typeof code === "string" && /^OFF-[EW][0-9]{4}$/u.test(code),
      ) ||
      !candidate.expectedDiagnosticCodes.every(
        (code, index, codes) => index === 0 || String(codes[index - 1]) <= String(code),
      ) ||
      typeof candidate.expected !== "string"
    ) {
      return undefined;
    }
    ids.add(candidate.id);
    cases.push(candidate as unknown as CorpusCase);
  }
  return {
    corpusVersion: "0.1",
    evaluatorFailures: value.evaluatorFailures,
    cases,
  };
}

function parseEvaluatorFailure(value: unknown): EvaluatorFailure | undefined {
  if (!isObject(value)) return undefined;
  const keys = Object.keys(value);
  if (
    !keys.includes("kind") ||
    !keys.includes("code") ||
    !keys.includes("operation") ||
    keys.some((key) => !evaluatorFailureKeys.has(key)) ||
    value.kind !== "evaluatorFailure" ||
    typeof value.code !== "string" ||
    !Object.hasOwn(evaluatorFailureOperations, value.code) ||
    typeof value.operation !== "string" ||
    !(evaluatorFailureOperations[value.code as EvaluatorFailure["code"]] as readonly string[])
      .includes(value.operation) ||
    ("resourceId" in value &&
      (typeof value.resourceId !== "string" || value.resourceId.length === 0)) ||
    ("path" in value && (typeof value.path !== "string" || value.path.length === 0))
  ) {
    return undefined;
  }
  return value as unknown as EvaluatorFailure;
}

function parseEvaluatorFailureVector(
  value: unknown,
): EvaluatorFailureVectorDocument | undefined {
  if (!isObject(value) || !exactKeys(value, evaluatorVectorKeys)) return undefined;
  if (
    value.vectorVersion !== "0.1" ||
    !Array.isArray(value.cases) ||
    value.cases.length === 0
  ) {
    return undefined;
  }
  const ids = new Set<string>();
  const cases: EvaluatorFailureVectorCase[] = [];
  for (const candidate of value.cases) {
    if (!isObject(candidate) || !exactKeys(candidate, evaluatorVectorCaseKeys)) {
      return undefined;
    }
    const expected = parseEvaluatorFailure(candidate.expected);
    if (
      typeof candidate.id !== "string" ||
      candidate.id.length === 0 ||
      ids.has(candidate.id) ||
      typeof candidate.boundary !== "string" ||
      candidate.boundary.length === 0 ||
      typeof candidate.package !== "string" ||
      candidate.package.length === 0 ||
      typeof candidate.evaluatedAt !== "string" ||
      !Array.isArray(candidate.requestedProfiles) ||
      !candidate.requestedProfiles.every(
        (profile): profile is string => typeof profile === "string",
      ) ||
      expected === undefined
    ) {
      return undefined;
    }
    ids.add(candidate.id);
    cases.push({
      id: candidate.id,
      boundary: candidate.boundary,
      package: candidate.package,
      evaluatedAt: candidate.evaluatedAt,
      requestedProfiles: candidate.requestedProfiles,
      expected,
    });
  }
  return { vectorVersion: "0.1", cases };
}

function safeRelativeReference(value: string): boolean {
  if (
    value.length === 0 ||
    isAbsolute(value) ||
    /^[A-Za-z]:/u.test(value) ||
    value.includes("\\")
  ) {
    return false;
  }
  return value.split("/").every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

function contained(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return fromRoot !== "" &&
    !isAbsolute(fromRoot) &&
    fromRoot !== ".." &&
    !fromRoot.startsWith(`..${sep}`);
}

async function checkedReference(
  root: string,
  reference: string,
  kind: "directory" | "file",
): Promise<CheckedReferenceResult> {
  if (!safeRelativeReference(reference)) return "pathEscape";
  let candidate = root;
  let identity: BigIntStats | undefined;
  const segments = reference.split("/");
  for (const [index, segment] of segments.entries()) {
    candidate = join(candidate, segment);
    let stat: BigIntStats;
    try {
      stat = await lstat(candidate, { bigint: true });
    } catch (error) {
      return isMissingPathError(error)
        ? "pathType"
        : evaluatorFailure("OFF-T1002", "resourceStat");
    }
    if (stat.isSymbolicLink()) return "pathEscape";
    if (index < segments.length - 1 && !stat.isDirectory()) return "pathType";
    identity = stat;
  }
  if (identity === undefined) return "pathType";

  let confirmedIdentity: BigIntStats;
  let resolved: string;
  try {
    confirmedIdentity = await lstat(candidate, { bigint: true });
  } catch (error) {
    return isMissingPathError(error)
      ? evaluatorFailure("OFF-T1003", "resourceMutation")
      : evaluatorFailure("OFF-T1002", "resourceStat");
  }
  if (!sameIdentity(identity, confirmedIdentity)) {
    return evaluatorFailure("OFF-T1003", "resourceMutation");
  }
  try {
    resolved = await realpath(candidate);
  } catch (error) {
    return isMissingPathError(error)
      ? evaluatorFailure("OFF-T1003", "resourceMutation")
      : evaluatorFailure("OFF-T1002", "resourceStat");
  }
  if (!contained(root, resolved)) return "pathEscape";
  if (
    (kind === "directory" && !identity.isDirectory()) ||
    (kind === "file" && !identity.isFile())
  ) {
    return "pathType";
  }
  let identityAfter: BigIntStats;
  try {
    identityAfter = await lstat(candidate, { bigint: true });
  } catch (error) {
    return isMissingPathError(error)
      ? evaluatorFailure("OFF-T1003", "resourceMutation")
      : evaluatorFailure("OFF-T1002", "resourceStat");
  }
  if (!sameIdentity(identity, identityAfter)) {
    return evaluatorFailure("OFF-T1003", "resourceMutation");
  }
  return { path: candidate, identity };
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function canonicalExpectation(
  documentBytes: Uint8Array,
): Uint8Array | "expectationFormat" {
  if (
    documentBytes.byteLength < 2 ||
    documentBytes[documentBytes.byteLength - 1] !== 0x0a
  ) {
    return "expectationFormat";
  }
  const payload = documentBytes.subarray(0, documentBytes.byteLength - 1);
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(payload);
    const canonical = canonicalizeJson(JSON.parse(text));
    return bytesEqual(payload, canonical) ? canonical : "expectationFormat";
  } catch {
    return "expectationFormat";
  }
}

function mismatch(id: string, reason: CorpusMismatchReason): CorpusCaseResult {
  return { id, status: "mismatch", reason };
}

function evaluatorFailureMismatch(
  id: string,
  reason: CorpusMismatchReason,
): EvaluatorFailureCaseResult {
  return { id, status: "mismatch", reason };
}

function isEvaluatorFailure(
  result: unknown,
): result is EvaluatorFailure {
  return typeof result === "object" && result !== null &&
    "kind" in result && result.kind === "evaluatorFailure";
}

async function verifyReferenceIdentity(
  reference: CheckedReference,
): Promise<EvaluatorFailure | undefined> {
  let current: BigIntStats;
  try {
    current = await lstat(reference.path, { bigint: true });
  } catch (error) {
    return isMissingPathError(error)
      ? evaluatorFailure("OFF-T1003", "resourceMutation")
      : evaluatorFailure("OFF-T1002", "resourceStat");
  }
  return sameIdentity(reference.identity, current)
    ? undefined
    : evaluatorFailure("OFF-T1003", "resourceMutation");
}

async function verifyCase(
  root: string,
  item: CorpusCase,
): Promise<CorpusCaseResult | EvaluatorFailure> {
  const packageReference = await checkedReference(root, item.package, "directory");
  if (typeof packageReference === "string") {
    return mismatch(item.id, packageReference);
  }
  if (isEvaluatorFailure(packageReference)) return packageReference;
  const expectedReference = await checkedReference(root, item.expected, "file");
  if (typeof expectedReference === "string") {
    return mismatch(item.id, expectedReference);
  }
  if (isEvaluatorFailure(expectedReference)) return expectedReference;

  const expectedRead = await boundedStableRead(
    expectedReference.path,
    expectedReference.identity,
    MAX_EXPECTATION_BYTES,
  );
  if (expectedRead.kind === "evaluatorFailure") return expectedRead;
  const expectedCanonical = canonicalExpectation(expectedRead.bytes);
  if (typeof expectedCanonical === "string") {
    return mismatch(item.id, expectedCanonical);
  }

  const evaluate = () => evaluatePackage({
    packageRoot: packageReference.path,
    evaluatedAt: item.evaluatedAt,
    requestedProfiles: item.requestedProfiles,
  });
  const first = await evaluate();
  if (first.kind === "evaluatorFailure") return first;
  const afterFirst = await verifyReferenceIdentity(packageReference);
  if (afterFirst !== undefined) return afterFirst;
  const second = await evaluate();
  if (second.kind === "evaluatorFailure") return second;
  const afterSecond = await verifyReferenceIdentity(packageReference);
  if (afterSecond !== undefined) return afterSecond;
  if (!bytesEqual(first.canonicalBytes, second.canonicalBytes)) {
    return mismatch(item.id, "nondeterministic");
  }
  if (first.normalized.outcome !== item.expectedOutcome) {
    return mismatch(item.id, "outcomeMismatch");
  }
  if (
    JSON.stringify(first.normalized.diagnostics.map(({ code }) => code)) !==
    JSON.stringify(item.expectedDiagnosticCodes)
  ) {
    return mismatch(item.id, "diagnosticMismatch");
  }

  if (!bytesEqual(expectedCanonical, first.canonicalBytes)) {
    return mismatch(item.id, "canonicalMismatch");
  }
  return {
    id: item.id,
    status: "passed",
    outcome: first.normalized.outcome,
  };
}

function sameEvaluationResult(
  left: EvaluationResult,
  right: EvaluationResult,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "packageResult" && right.kind === "packageResult") {
    return bytesEqual(left.canonicalBytes, right.canonicalBytes);
  }
  if (left.kind === "evaluatorFailure" && right.kind === "evaluatorFailure") {
    return bytesEqual(canonicalizeJson(left), canonicalizeJson(right));
  }
  return false;
}

export function compareEvaluatorFailureRuns(
  id: string,
  expected: EvaluatorFailure,
  first: EvaluationResult,
  second: EvaluationResult,
): EvaluatorFailureCaseResult {
  if (!sameEvaluationResult(first, second)) {
    return evaluatorFailureMismatch(id, "nondeterministic");
  }
  if (
    first.kind !== "evaluatorFailure" ||
    !bytesEqual(canonicalizeJson(first), canonicalizeJson(expected))
  ) {
    return evaluatorFailureMismatch(id, "evaluatorFailureMismatch");
  }
  return { id, status: "passed", evaluatorFailure: first };
}

async function verifyEvaluatorFailureCase(
  root: string,
  item: EvaluatorFailureVectorCase,
): Promise<EvaluatorFailureCaseResult | EvaluatorFailure> {
  if (!safeRelativeReference(item.package)) {
    return evaluatorFailureMismatch(item.id, "pathEscape");
  }
  const configurationPermitsPackageIo =
    isWholeSecondUtcTimestamp(item.evaluatedAt) &&
    item.requestedProfiles.every(isAbsoluteUri) &&
    new Set(item.requestedProfiles).size === item.requestedProfiles.length;
  let packagePath: string;
  let packageReference: CheckedReference | undefined;
  if (configurationPermitsPackageIo) {
    const checked = await checkedReference(root, item.package, "directory");
    if (typeof checked === "string") {
      return evaluatorFailureMismatch(item.id, checked);
    }
    if (isEvaluatorFailure(checked)) return checked;
    packageReference = checked;
    packagePath = checked.path;
  } else {
    // A configuration failure is required to occur before package I/O. Resolve
    // only the already-checked lexical reference: stat/realpath would weaken
    // the vector by letting an I/O-first evaluator fail outside the primitive.
    packagePath = resolve(root, item.package);
  }

  const evaluate = () => evaluatePackage({
    packageRoot: packagePath,
    evaluatedAt: item.evaluatedAt,
    requestedProfiles: item.requestedProfiles,
  });
  const first = await evaluate();
  if (packageReference !== undefined) {
    const afterFirst = await verifyReferenceIdentity(packageReference);
    if (afterFirst !== undefined) return afterFirst;
  }
  const second = await evaluate();
  if (packageReference !== undefined) {
    const afterSecond = await verifyReferenceIdentity(packageReference);
    if (afterSecond !== undefined) return afterSecond;
  }
  return compareEvaluatorFailureRuns(item.id, item.expected, first, second);
}

function invalidCorpus(reason: CorpusMismatchReason = "invalidCorpus"): CorpusResult {
  return {
    kind: "corpusResult",
    ok: false,
    corpusVersion: "0.1",
    cases: [mismatch("corpus", reason)],
    evaluatorFailureCases: [],
  };
}

function invalidEvaluatorVector(reason: CorpusMismatchReason): CorpusResult {
  return {
    kind: "corpusResult",
    ok: false,
    corpusVersion: "0.1",
    cases: [],
    evaluatorFailureCases: [
      evaluatorFailureMismatch("evaluator-failures", reason),
    ],
  };
}

export async function verifyCorpus(
  corpusPath: string,
): Promise<CorpusVerificationResult> {
  let corpusIdentity: BigIntStats;
  let corpusRoot: string;
  let bytes: Uint8Array;
  try {
    corpusIdentity = await lstat(corpusPath, { bigint: true });
    if (!corpusIdentity.isFile() || corpusIdentity.isSymbolicLink()) {
      return invalidCorpus("pathEscape");
    }
    corpusRoot = await realpath(dirname(resolve(corpusPath)));
    const resolvedCorpus = await realpath(corpusPath);
    if (!contained(corpusRoot, resolvedCorpus)) return invalidCorpus("pathEscape");
  } catch {
    return evaluatorFailure("OFF-T1002", "rootAccess");
  }
  const corpusRead = await boundedStableRead(
    corpusPath,
    corpusIdentity,
    MAX_CORPUS_BYTES,
  );
  if (corpusRead.kind === "evaluatorFailure") return corpusRead;
  bytes = corpusRead.bytes;

  let document: CorpusDocument | undefined;
  try {
    document = parseCorpus(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  } catch {
    return invalidCorpus();
  }
  if (document === undefined) return invalidCorpus();

  const vectorReference = await checkedReference(
    corpusRoot,
    document.evaluatorFailures,
    "file",
  );
  if (typeof vectorReference === "string") {
    return invalidEvaluatorVector(vectorReference);
  }
  if (isEvaluatorFailure(vectorReference)) return vectorReference;
  const vectorRead = await boundedStableRead(
    vectorReference.path,
    vectorReference.identity,
    MAX_EVALUATOR_VECTOR_BYTES,
  );
  if (vectorRead.kind === "evaluatorFailure") return vectorRead;
  let evaluatorVector: EvaluatorFailureVectorDocument | undefined;
  try {
    evaluatorVector = parseEvaluatorFailureVector(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(vectorRead.bytes)),
    );
  } catch {
    return invalidEvaluatorVector("invalidEvaluatorVector");
  }
  if (evaluatorVector === undefined) {
    return invalidEvaluatorVector("invalidEvaluatorVector");
  }

  const cases: CorpusCaseResult[] = [];
  for (const item of document.cases) {
    const result = await verifyCase(corpusRoot, item);
    if (isEvaluatorFailure(result)) return result;
    cases.push(result);
  }
  const evaluatorFailureCases: EvaluatorFailureCaseResult[] = [];
  for (const item of evaluatorVector.cases) {
    const result = await verifyEvaluatorFailureCase(corpusRoot, item);
    if (isEvaluatorFailure(result)) return result;
    evaluatorFailureCases.push(result);
  }
  return {
    kind: "corpusResult",
    ok: cases.every(({ status }) => status === "passed") &&
      evaluatorFailureCases.every(({ status }) => status === "passed"),
    corpusVersion: "0.1",
    cases,
    evaluatorFailureCases,
  };
}
