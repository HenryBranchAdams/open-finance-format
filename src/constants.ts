export const OFF_VERSION = "0.1" as const;
export const NORMALIZER_VERSION = "0.1" as const;

export const MAX_SAFE_JSON_INTEGER = 9_007_199_254_740_991;
export const CANONICAL_NON_NEGATIVE_INTEGER = /^(?:0|[1-9][0-9]*)$/u;

export const ADMISSION_RULES = {
  missingManifest: { code: "OFF-E1006", id: "OFF.MANIFEST.MISSING" },
  utf8: { code: "OFF-E1001", id: "OFF.ADMISSION.UTF8" },
  json: { code: "OFF-E1002", id: "OFF.ADMISSION.JSON" },
  duplicateName: {
    code: "OFF-E1003",
    id: "OFF.ADMISSION.DUPLICATE_NAME",
  },
  unicode: { code: "OFF-E1004", id: "OFF.ADMISSION.UNICODE" },
  number: { code: "OFF-E1005", id: "OFF.ADMISSION.NUMBER" },
} as const;

export const DEFAULT_ADMISSION_LIMITS = {
  maxDepth: 256,
  maxTokens: 1_000_000,
} as const;
