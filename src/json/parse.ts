import {
  ADMISSION_RULES,
  CANONICAL_NON_NEGATIVE_INTEGER,
  DEFAULT_ADMISSION_LIMITS,
  MAX_SAFE_JSON_INTEGER,
} from "../constants.ts";
import type {
  AdmissionDiagnostic,
  AdmissionLimits,
  AdmissionResult,
  JsonNumberToken,
  JsonValue,
} from "../types.ts";
import { canonicalizeJson } from "./jcs.ts";

type JsonPath = readonly string[];

class JsonSyntaxFailure extends SyntaxError {
  readonly offset: number;

  constructor(offset: number, message: string) {
    super(message);
    this.offset = offset;
  }
}

export class AdmissionLimitError extends RangeError {
  readonly code = "OFF-T1001";

  constructor(message: string) {
    super(message);
    this.name = "AdmissionLimitError";
  }
}

export function escapeJsonPointerToken(token: string): string {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function jsonPointer(path: JsonPath): string {
  return path.length === 0 ? "" : `/${path.map(escapeJsonPointerToken).join("/")}`;
}

function isKnownIntegerPath(path: JsonPath): boolean {
  return (
    path.length === 3 &&
    path[0] === "resources" &&
    /^(?:0|[1-9][0-9]*)$/u.test(path[1] ?? "") &&
    path[2] === "byteSize"
  );
}

function isOpaqueExtensionPath(path: JsonPath): boolean {
  return path.length >= 2 && path[0] === "extensions";
}

function firstLoneSurrogateOffset(value: string): number | undefined {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return index;
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return index;
    }
  }
  return undefined;
}

function utf8ByteOffset(text: string, codeUnitOffset: number): number {
  return new TextEncoder().encode(text.slice(0, codeUnitOffset)).byteLength;
}

function firstInvalidUtf8Offset(input: Uint8Array): number | undefined {
  const isContinuation = (value: number | undefined): value is number =>
    value !== undefined && value >= 0x80 && value <= 0xbf;

  for (let index = 0; index < input.length; ) {
    const first = input[index];
    if (first === undefined) {
      return index;
    }
    if (first <= 0x7f) {
      index += 1;
      continue;
    }

    let length: 2 | 3 | 4;
    let secondMinimum = 0x80;
    let secondMaximum = 0xbf;
    if (first >= 0xc2 && first <= 0xdf) {
      length = 2;
    } else if (first >= 0xe0 && first <= 0xef) {
      length = 3;
      if (first === 0xe0) secondMinimum = 0xa0;
      if (first === 0xed) secondMaximum = 0x9f;
    } else if (first >= 0xf0 && first <= 0xf4) {
      length = 4;
      if (first === 0xf0) secondMinimum = 0x90;
      if (first === 0xf4) secondMaximum = 0x8f;
    } else {
      return index;
    }

    const second = input[index + 1];
    if (second === undefined) return index;
    if (second < secondMinimum || second > secondMaximum) return index + 1;
    for (let continuation = 2; continuation < length; continuation += 1) {
      const byte = input[index + continuation];
      if (byte === undefined) return index;
      if (!isContinuation(byte)) return index + continuation;
    }
    index += length;
  }
  return undefined;
}

function diagnostic(
  rule: (typeof ADMISSION_RULES)[keyof typeof ADMISSION_RULES],
  instanceLocation: string,
  parameters: AdmissionDiagnostic["parameters"] = {},
): AdmissionDiagnostic {
  return {
    code: rule.code,
    severity: "error",
    instanceLocation,
    ruleId: rule.id,
    parameters,
  };
}

class RawJsonScanner {
  private offset = 0;
  private tokenCount = 0;
  private readonly diagnosticCandidates = new Map<string, ComparableDiagnostic>();
  readonly numberTokens: JsonNumberToken[] = [];
  private readonly text: string;
  private readonly limits: AdmissionLimits;

  constructor(text: string, limits: AdmissionLimits) {
    this.text = text;
    this.limits = limits;
  }

  scan(): void {
    this.skipWhitespace();
    this.scanValue([], 0);
    this.skipWhitespace();
    if (this.offset !== this.text.length) {
      this.fail("Unexpected content after the root JSON value");
    }
  }

  get position(): number {
    return this.offset;
  }

  get diagnostics(): readonly AdmissionDiagnostic[] {
    return sortedComparableDiagnostics(this.diagnosticCandidates.values());
  }

  private recordDiagnostic(value: AdmissionDiagnostic): void {
    retainDiagnosticCandidate(this.diagnosticCandidates, value);
  }

  private countToken(depth: number): void {
    this.tokenCount += 1;
    if (this.tokenCount > this.limits.maxTokens) {
      throw new AdmissionLimitError("JSON token limit exceeded");
    }
    if (depth > this.limits.maxDepth) {
      throw new AdmissionLimitError("JSON nesting limit exceeded");
    }
  }

  private scanValue(
    path: JsonPath,
    depth: number,
    suppressDiagnostics = false,
  ): void {
    this.countToken(depth);
    this.skipWhitespace();
    const current = this.text[this.offset];
    if (current === "{") {
      this.scanObject(path, depth, suppressDiagnostics);
    } else if (current === "[") {
      this.scanArray(path, depth, suppressDiagnostics);
    } else if (current === '"') {
      this.scanString(path, suppressDiagnostics);
    } else if (current === "t") {
      this.scanLiteral("true");
    } else if (current === "f") {
      this.scanLiteral("false");
    } else if (current === "n") {
      this.scanLiteral("null");
    } else if (current === "-" || (current !== undefined && /[0-9]/u.test(current))) {
      this.scanNumber(path, suppressDiagnostics);
    } else {
      this.fail("Expected a JSON value");
    }
  }

  private scanObject(
    path: JsonPath,
    depth: number,
    suppressDiagnostics: boolean,
  ): void {
    this.offset += 1;
    this.skipWhitespace();
    const occurrences = new Map<string, number>();
    if (this.text[this.offset] === "}") {
      this.offset += 1;
      return;
    }

    while (true) {
      if (this.text[this.offset] !== '"') {
        this.fail("Expected an object member name");
      }
      const scannedName = this.scanString(path, suppressDiagnostics);
      const suppressMember =
        suppressDiagnostics || scannedName.hasLoneSurrogate;
      const memberPath = suppressMember ? path : [...path, scannedName.value];
      if (!suppressMember) {
        const occurrence = (occurrences.get(scannedName.value) ?? 0) + 1;
        occurrences.set(scannedName.value, occurrence);
        if (occurrence > 1) {
          this.recordDiagnostic(
            diagnostic(ADMISSION_RULES.duplicateName, jsonPointer(path), {
              name: scannedName.value,
              occurrence,
            }),
          );
        }
      }
      this.skipWhitespace();
      if (this.text[this.offset] !== ":") {
        this.fail("Expected ':' after an object member name");
      }
      this.offset += 1;
      this.scanValue(memberPath, depth + 1, suppressMember);
      this.skipWhitespace();
      const separator = this.text[this.offset];
      if (separator === "}") {
        this.offset += 1;
        return;
      }
      if (separator !== ",") {
        this.fail("Expected ',' or '}' after an object member");
      }
      this.offset += 1;
      this.skipWhitespace();
    }
  }

  private scanArray(
    path: JsonPath,
    depth: number,
    suppressDiagnostics: boolean,
  ): void {
    this.offset += 1;
    this.skipWhitespace();
    if (this.text[this.offset] === "]") {
      this.offset += 1;
      return;
    }

    let index = 0;
    while (true) {
      this.scanValue(
        suppressDiagnostics ? path : [...path, String(index)],
        depth + 1,
        suppressDiagnostics,
      );
      index += 1;
      this.skipWhitespace();
      const separator = this.text[this.offset];
      if (separator === "]") {
        this.offset += 1;
        return;
      }
      if (separator !== ",") {
        this.fail("Expected ',' or ']' after an array element");
      }
      this.offset += 1;
      this.skipWhitespace();
    }
  }

  private scanString(
    path: JsonPath,
    suppressDiagnostics: boolean,
  ): { readonly value: string; readonly hasLoneSurrogate: boolean } {
    const start = this.offset;
    this.offset += 1;
    while (this.offset < this.text.length) {
      const current = this.text[this.offset];
      if (current === '"') {
        this.offset += 1;
        const raw = this.text.slice(start, this.offset);
        const value = JSON.parse(raw) as string;
        const codeUnitOffset = firstLoneSurrogateOffset(value);
        if (codeUnitOffset !== undefined && !suppressDiagnostics) {
          this.recordDiagnostic(
            diagnostic(ADMISSION_RULES.unicode, jsonPointer(path), {
              codeUnitOffset,
            }),
          );
        }
        return { value, hasLoneSurrogate: codeUnitOffset !== undefined };
      }
      if (current === "\\") {
        this.offset += 1;
        const escaped = this.text[this.offset];
        if (escaped === "u") {
          for (let digit = 1; digit <= 4; digit += 1) {
            const hexDigit = this.text[this.offset + digit];
            if (hexDigit === undefined || !/[0-9a-fA-F]/u.test(hexDigit)) {
              this.offset += digit;
              this.fail("Invalid Unicode escape");
            }
          }
          this.offset += 5;
          continue;
        }
        if (escaped === undefined || !'"\\/bfnrt'.includes(escaped)) {
          this.fail("Invalid string escape");
        }
        this.offset += 1;
        continue;
      }
      if (current === undefined || current.charCodeAt(0) < 0x20) {
        this.fail("Unescaped control character in string");
      }
      this.offset += 1;
    }
    this.fail("Unterminated JSON string");
  }

  private scanLiteral(literal: "true" | "false" | "null"): void {
    for (let index = 0; index < literal.length; index += 1) {
      if (this.text[this.offset + index] !== literal[index]) {
        this.offset += index;
        this.fail("Invalid JSON literal");
      }
    }
    this.offset += literal.length;
    this.requireValueDelimiter();
  }

  private scanNumber(path: JsonPath, suppressDiagnostics: boolean): void {
    const start = this.offset;
    if (this.text[this.offset] === "-") {
      this.offset += 1;
    }

    if (this.text[this.offset] === "0") {
      this.offset += 1;
    } else if (this.text[this.offset] !== undefined && /[1-9]/u.test(this.text[this.offset] ?? "")) {
      this.offset += 1;
      while (this.text[this.offset] !== undefined && /[0-9]/u.test(this.text[this.offset] ?? "")) {
        this.offset += 1;
      }
    } else {
      this.fail("Invalid JSON number integer component");
    }

    if (this.text[this.offset] === ".") {
      this.offset += 1;
      if (this.text[this.offset] === undefined || !/[0-9]/u.test(this.text[this.offset] ?? "")) {
        this.fail("Invalid JSON number fractional component");
      }
      while (this.text[this.offset] !== undefined && /[0-9]/u.test(this.text[this.offset] ?? "")) {
        this.offset += 1;
      }
    }

    if (this.text[this.offset] === "e" || this.text[this.offset] === "E") {
      this.offset += 1;
      if (this.text[this.offset] === "+" || this.text[this.offset] === "-") {
        this.offset += 1;
      }
      if (this.text[this.offset] === undefined || !/[0-9]/u.test(this.text[this.offset] ?? "")) {
        this.fail("Invalid JSON number exponent");
      }
      while (this.text[this.offset] !== undefined && /[0-9]/u.test(this.text[this.offset] ?? "")) {
        this.offset += 1;
      }
    }

    this.requireValueDelimiter();
    const raw = this.text.slice(start, this.offset);
    const value = Number(raw);
    if (suppressDiagnostics) {
      return;
    }
    const instanceLocation = jsonPointer(path);
    let kind: JsonNumberToken["kind"] = "disallowed";
    let accepted = false;
    let reason = "numberNotAllowedAtLocation";

    if (isKnownIntegerPath(path)) {
      kind = "knownInteger";
      accepted =
        CANONICAL_NON_NEGATIVE_INTEGER.test(raw) &&
        Number.isSafeInteger(value) &&
        value <= MAX_SAFE_JSON_INTEGER;
      reason = "notCanonicalNonNegativeSafeInteger";
    } else if (isOpaqueExtensionPath(path)) {
      kind = "opaqueExtension";
      accepted = Number.isFinite(value);
      reason = "notFiniteBinary64";
    }

    this.numberTokens.push({ instanceLocation, raw, value, kind });
    if (!accepted) {
      this.recordDiagnostic(
        diagnostic(ADMISSION_RULES.number, instanceLocation, {
          lexeme: raw,
          reason,
        }),
      );
    }
  }

  private requireValueDelimiter(): void {
    const current = this.text[this.offset];
    if (
      current !== undefined &&
      current !== "," &&
      current !== "]" &&
      current !== "}" &&
      !/\s/u.test(current)
    ) {
      this.fail("JSON token is not followed by a delimiter");
    }
  }

  private skipWhitespace(): void {
    while (this.text[this.offset] === " " || this.text[this.offset] === "\t" || this.text[this.offset] === "\r" || this.text[this.offset] === "\n") {
      this.offset += 1;
    }
  }

  private fail(message: string): never {
    throw new JsonSyntaxFailure(this.offset, message);
  }
}

function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const sharedLength = Math.min(left.byteLength, right.byteLength);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftByte = left[index];
    const rightByte = right[index];
    if (leftByte !== rightByte) {
      return (leftByte ?? 0) - (rightByte ?? 0);
    }
  }
  return left.byteLength - right.byteLength;
}

interface ComparableDiagnostic {
  readonly diagnostic: AdmissionDiagnostic;
  readonly parameterBytes: Uint8Array;
}

function retainDiagnosticCandidate(
  byCardinalityKey: Map<string, ComparableDiagnostic>,
  diagnosticValue: AdmissionDiagnostic,
): void {
  const candidate: ComparableDiagnostic = {
    diagnostic: diagnosticValue,
    parameterBytes: canonicalizeJson(diagnosticValue.parameters),
  };
  const key = cardinalityKey(diagnosticValue);
  const existing = byCardinalityKey.get(key);
  if (
    existing === undefined ||
    compareBytes(candidate.parameterBytes, existing.parameterBytes) < 0
  ) {
    byCardinalityKey.set(key, candidate);
  }
  // Equal parameter bytes under one admission key are wire-identical because
  // the key fixes the rule and instance location; retaining the first is a
  // deterministic output tie-break without accumulating duplicate objects.
}

function cardinalityKey(diagnosticValue: AdmissionDiagnostic): string {
  if (
    diagnosticValue.ruleId === ADMISSION_RULES.utf8.id ||
    diagnosticValue.ruleId === ADMISSION_RULES.json.id
  ) {
    return JSON.stringify([diagnosticValue.ruleId]);
  }
  return JSON.stringify([
    diagnosticValue.ruleId,
    diagnosticValue.instanceLocation,
  ]);
}

function isPortableDiagnostic(diagnosticValue: AdmissionDiagnostic): boolean {
  if (firstLoneSurrogateOffset(diagnosticValue.instanceLocation) !== undefined) {
    return false;
  }
  return Object.values(diagnosticValue.parameters).every(
    (value) =>
      typeof value !== "string" || firstLoneSurrogateOffset(value) === undefined,
  );
}

function sortedComparableDiagnostics(
  diagnostics: Iterable<ComparableDiagnostic>,
): AdmissionDiagnostic[] {
  return [...diagnostics]
    .sort(
      (left, right) =>
        compareCodeUnits(left.diagnostic.severity, right.diagnostic.severity) ||
        compareCodeUnits(left.diagnostic.code, right.diagnostic.code) ||
        compareCodeUnits(
          left.diagnostic.instanceLocation,
          right.diagnostic.instanceLocation,
        ) ||
        compareCodeUnits(left.diagnostic.ruleId, right.diagnostic.ruleId) ||
        compareBytes(left.parameterBytes, right.parameterBytes),
    )
    .map((entry) => entry.diagnostic);
}

export function admitJson(
  input: Uint8Array,
  limits: AdmissionLimits = DEFAULT_ADMISSION_LIMITS,
): AdmissionResult {
  let text: string;
  const invalidUtf8Offset = firstInvalidUtf8Offset(input);
  if (invalidUtf8Offset !== undefined) {
    return {
      ok: false,
      diagnostics: [
        diagnostic(ADMISSION_RULES.utf8, "", {
          byteOffset: invalidUtf8Offset,
        }),
      ],
    };
  }
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(input);
  } catch {
    return {
      ok: false,
      diagnostics: [
        diagnostic(ADMISSION_RULES.utf8, "", {
          byteOffset: 0,
        }),
      ],
    };
  }

  const scanner = new RawJsonScanner(text, limits);
  try {
    scanner.scan();
  } catch (error) {
    if (error instanceof AdmissionLimitError) {
      throw error;
    }
    const offset = error instanceof JsonSyntaxFailure ? error.offset : scanner.position;
    return {
      ok: false,
      diagnostics: [
        diagnostic(ADMISSION_RULES.json, "", {
          byteOffset: utf8ByteOffset(text, offset),
        }),
      ],
    };
  }

  const scannerDiagnostics = scanner.diagnostics.filter(isPortableDiagnostic);
  if (scannerDiagnostics.length > 0) {
    return {
      ok: false,
      diagnostics: scannerDiagnostics,
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(text) as JsonValue,
      numberTokens: scanner.numberTokens,
      diagnostics: [],
    };
  } catch {
    return {
      ok: false,
      diagnostics: [
        diagnostic(ADMISSION_RULES.json, "", {
          byteOffset: 0,
        }),
      ],
    };
  }
}
