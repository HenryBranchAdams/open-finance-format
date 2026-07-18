export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export type AdmissionErrorCode =
  | "OFF-E1001"
  | "OFF-E1002"
  | "OFF-E1003"
  | "OFF-E1004"
  | "OFF-E1005"
  | "OFF-E1006";

export type AdmissionRuleId =
  | "OFF.ADMISSION.UTF8"
  | "OFF.ADMISSION.JSON"
  | "OFF.ADMISSION.DUPLICATE_NAME"
  | "OFF.ADMISSION.UNICODE"
  | "OFF.ADMISSION.NUMBER"
  | "OFF.MANIFEST.MISSING";

export interface AdmissionDiagnostic {
  readonly code: AdmissionErrorCode;
  readonly severity: "error";
  readonly instanceLocation: string;
  readonly ruleId: AdmissionRuleId;
  readonly parameters: Readonly<Record<string, JsonPrimitive>>;
}

export type NumberTokenKind = "knownInteger" | "opaqueExtension" | "disallowed";

export interface JsonNumberToken {
  readonly instanceLocation: string;
  readonly raw: string;
  readonly value: number;
  readonly kind: NumberTokenKind;
}

export interface AdmissionSuccess {
  readonly ok: true;
  readonly value: JsonValue;
  readonly numberTokens: readonly JsonNumberToken[];
  readonly diagnostics: readonly [];
}

export interface AdmissionFailure {
  readonly ok: false;
  readonly diagnostics: readonly AdmissionDiagnostic[];
}

export type AdmissionResult = AdmissionSuccess | AdmissionFailure;

export interface AdmissionLimits {
  readonly maxDepth: number;
  readonly maxTokens: number;
}
