export declare class QualificationEvidenceError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
  constructor(code: string, message: string, details?: Record<string, unknown>);
}

export declare function parseQualificationEvidence(
  markdown: string,
  options?: { readonly sourceKind?: "external-attempt" | "local-rehearsal" },
): {
  readonly kind: "offQualificationEvidence";
  readonly candidate: "v0.1-rc.1";
  readonly sourceKind: "external-attempt" | "local-rehearsal";
  readonly record: Record<string, unknown>;
  readonly states: Record<string, string>;
};
