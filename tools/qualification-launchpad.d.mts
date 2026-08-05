export const CANDIDATE: string;
export const CHECKSUM_MANIFEST: string;
export const REQUIRED_MATERIALS: readonly {
  readonly source: string;
  readonly target: string;
}[];

export class QualificationLaunchpadError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;
}

export interface QualificationLaunchpadInput {
  readonly candidateRoot: string;
  readonly publicCommit: string;
  readonly checksumManifestSha256: string;
  readonly outputRoot: string;
  readonly createdAt?: string;
}

export interface QualificationLaunchpadManifest {
  readonly manifestVersion: string;
  readonly kind: string;
  readonly candidate: string;
  readonly createdAt: string;
  readonly authentication: {
    readonly suppliedPublicVcsCommit: string;
    readonly suppliedChecksumManifestSha256: string;
    readonly localPreflight: string;
    readonly publicVcsCommit: string;
    readonly checksumManifestDigest: string;
    readonly publicHumanReview: string;
  };
  readonly independence: string;
  readonly gates: {
    readonly independentConsumer: string;
    readonly independentProducer: string;
    readonly tenMinuteCoreAuthoring: string;
    readonly adoption: string;
  };
  readonly sequence: readonly string[];
  readonly sourceMaterials: readonly {
    readonly source: string;
    readonly target: string;
  }[];
  readonly prohibitedEffects: readonly string[];
}

export interface QualificationLaunchpadResult {
  readonly kind: string;
  readonly candidate: string;
  readonly outputRoot: string;
  readonly files: readonly string[];
  readonly manifest: QualificationLaunchpadManifest;
}

export function prepareQualificationLaunchpad(
  input: QualificationLaunchpadInput,
): Promise<QualificationLaunchpadResult>;
