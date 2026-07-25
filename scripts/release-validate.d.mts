export const FROZEN_RC1_GIT_COMMIT: string;

export function materializeGitSnapshot(
  repositoryRoot: string,
  commit: string,
  destination: string,
): Promise<void>;

export function validateRelease(
  releaseRoot: string,
): Promise<unknown>;

export function validateFrozenRc1(
  repositoryRoot: string,
  commit?: string,
): Promise<unknown>;
