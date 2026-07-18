import {
  createDiagnostic,
  finalizeDiagnostics,
  type Diagnostic,
} from "./diagnostics.ts";
import type { LineageGraph } from "./lineage.ts";
import { selectedTerminalIdsByTarget } from "./reachability.ts";
import { isWholeSecondUtcTimestamp } from "./schema.ts";

export interface FreshnessLeafInput {
  readonly id: string;
  readonly threshold: string;
  readonly pointer: string;
}

export interface FreshnessHeadlineInput {
  readonly id: string;
  readonly pointer: string;
}

export interface FreshnessLeafResult {
  readonly entityId: string;
  readonly status: "current" | "stale";
  readonly threshold: string;
}

export interface FreshnessHeadlineResult {
  readonly entityId: string;
  readonly status: "current" | "stale";
  readonly staleDependencyIds: readonly string[];
}

export interface FreshnessEvaluation {
  readonly leaves: readonly FreshnessLeafResult[];
  readonly headlines: readonly FreshnessHeadlineResult[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface EvaluateFreshnessInput {
  readonly evaluatedAt: string;
  readonly graph: LineageGraph;
  readonly leaves: readonly FreshnessLeafInput[];
  readonly headlines: readonly FreshnessHeadlineInput[];
}

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareUtf16);
}

export function evaluateFreshness(
  input: EvaluateFreshnessInput,
): FreshnessEvaluation {
  if (!isWholeSecondUtcTimestamp(input.evaluatedAt)) {
    throw new TypeError("evaluatedAt must be a real whole-second UTC timestamp ending in Z");
  }
  const staleLeafIds = new Set<string>();
  const leafResults: FreshnessLeafResult[] = [];
  const diagnostics: Diagnostic[] = [];

  for (const leaf of [...input.leaves].sort((left, right) => compareUtf16(left.id, right.id))) {
    if (!isWholeSecondUtcTimestamp(leaf.threshold)) {
      throw new TypeError(`Freshness threshold for ${leaf.id} is not canonical UTC`);
    }
    const stale = input.evaluatedAt >= leaf.threshold;
    leafResults.push({
      entityId: leaf.id,
      status: stale ? "stale" : "current",
      threshold: leaf.threshold,
    });
    if (stale) {
      staleLeafIds.add(leaf.id);
      diagnostics.push(
        createDiagnostic(
          "OFF.FRESHNESS.LEAF_STALE",
          leaf.pointer,
          { evaluatedAt: input.evaluatedAt, threshold: leaf.threshold },
          leaf.id,
        ),
      );
    }
  }

  const sortedHeadlines = [...input.headlines].sort((left, right) =>
    compareUtf16(left.id, right.id)
  );
  const staleDependenciesByHeadline = selectedTerminalIdsByTarget(
    input.graph,
    sortedHeadlines.map(({ id }) => id),
    staleLeafIds,
  );
  const headlineResults: FreshnessHeadlineResult[] = [];
  for (const headline of sortedHeadlines) {
    const staleDependencyIds = sortedUnique(
      staleDependenciesByHeadline.get(headline.id) ?? [],
    );
    const stale = staleDependencyIds.length > 0;
    headlineResults.push({
      entityId: headline.id,
      status: stale ? "stale" : "current",
      staleDependencyIds,
    });
    if (stale) {
      diagnostics.push(
        createDiagnostic(
          "OFF.FRESHNESS.HEADLINE_STALE",
          headline.pointer,
          { evaluatedAt: input.evaluatedAt, staleDependencyIds },
          headline.id,
        ),
      );
    }
  }

  return {
    leaves: leafResults,
    headlines: headlineResults,
    diagnostics: finalizeDiagnostics(diagnostics),
  };
}
