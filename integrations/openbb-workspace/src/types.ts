export interface EvaluatorFailure {
  readonly kind: "evaluatorFailure";
  readonly code: string;
  readonly operation: string;
  readonly resourceId?: string;
  readonly path?: string;
}

export interface NormalizedResult extends Record<string, unknown> {
  readonly evaluationContext: {
    readonly offVersion: string;
    readonly normalizerVersion: string;
    readonly evaluatedAt: string;
    readonly requestedProfiles: readonly string[];
  };
  readonly outcome: "valid" | "validWithWarnings" | "invalid";
  readonly profileResults: {
    readonly core: { readonly status: "passed" | "failed" };
    readonly declared: readonly Record<string, unknown>[];
  };
  readonly diagnostics: readonly Record<string, unknown>[];
  readonly packageIdentity?: Readonly<Record<string, unknown>>;
  readonly resourceInventory?: readonly Record<string, unknown>[];
  readonly relationshipInventory?: readonly Record<string, unknown>[];
  readonly profileEntities?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly resolvedLineage?: readonly Record<string, unknown>[];
  readonly freshness?: Readonly<Record<string, readonly Record<string, unknown>[]>>;
}

export type EvaluationResult =
  | {
      readonly kind: "packageResult";
      readonly normalized: NormalizedResult;
      readonly canonicalBytes: Uint8Array;
    }
  | EvaluatorFailure;

export interface OffApi {
  readonly PUBLIC_EQUITY_PROFILE_URI: string;
  readonly WORKBOOK_BINDING_PROFILE_URI: string;
  evaluatePackage(options: {
    readonly packageRoot: string;
    readonly evaluatedAt: string;
    readonly requestedProfiles: readonly string[];
  }): Promise<EvaluationResult>;
}

export interface PackageRecord {
  readonly id: string;
  readonly packageRoot: string;
  readonly configuredRoot: string;
  readonly title: string;
  readonly releaseId?: string;
  readonly releaseVersion?: string;
  readonly packageIdentityId?: string;
  readonly declaredProfiles: readonly string[];
  readonly outcome: NormalizedResult["outcome"] | "evaluatorFailure";
  readonly evaluatorFailure?: Readonly<{ code: string; operation: string }>;
}

export interface EvaluationState {
  readonly record: PackageRecord;
  readonly evaluatedAt: string;
  readonly requestedProfiles: readonly string[];
  readonly result: EvaluationResult;
}
