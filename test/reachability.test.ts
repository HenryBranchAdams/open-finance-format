import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeLineage,
  type GraphNodeKind,
  type LineageEdge,
} from "../src/lineage.ts";
import { selectedTerminalIdsByTarget } from "../src/reachability.ts";

function graph(
  kinds: ReadonlyMap<string, GraphNodeKind>,
  edges: readonly LineageEdge[],
) {
  const analysis = analyzeLineage(kinds, edges);
  assert.equal(analysis.ok, true);
  if (!analysis.ok) throw new Error("fixture graph must be acyclic");
  return analysis.graph;
}

function sortedValues(
  valuesByTarget: ReadonlyMap<string, ReadonlySet<string>>,
  targetId: string,
): string[] {
  return [...(valuesByTarget.get(targetId) ?? [])].sort();
}

test("one target collects selected terminals along an accumulating chain", () => {
  const count = 1_024;
  const outputIds = Array.from(
    { length: count },
    (_, index) => `urn:output:${index.toString().padStart(4, "0")}`,
  );
  const terminalIds = Array.from(
    { length: count },
    (_, index) => `urn:terminal:${index.toString().padStart(4, "0")}`,
  );
  const kinds = new Map<string, GraphNodeKind>();
  for (const id of outputIds) kinds.set(id, "output");
  for (const id of terminalIds) kinds.set(id, "sourceFact");
  const edges: LineageEdge[] = [];
  for (let index = 0; index < count; index += 1) {
    edges.push({
      fromId: outputIds[index]!,
      toId: terminalIds[index]!,
      material: true,
    });
    if (index + 1 < count) {
      edges.push({
        fromId: outputIds[index]!,
        toId: outputIds[index + 1]!,
        material: true,
      });
    }
  }

  const targetId = outputIds[0]!;
  const result = selectedTerminalIdsByTarget(
    graph(kinds, edges),
    [targetId],
    terminalIds,
  );
  assert.deepEqual(sortedValues(result, targetId), terminalIds);
  assert.equal(result.size, 1);
});

test("many targets share a long chain to one selected terminal", () => {
  const headlineIds = Array.from(
    { length: 512 },
    (_, index) => `urn:headline:${index.toString().padStart(4, "0")}`,
  );
  const sharedIds = Array.from(
    { length: 1_024 },
    (_, index) => `urn:shared:${index.toString().padStart(4, "0")}`,
  );
  const terminalId = "urn:terminal:shared";
  const kinds = new Map<string, GraphNodeKind>([[terminalId, "sourceFact"]]);
  for (const id of [...headlineIds, ...sharedIds]) kinds.set(id, "output");
  const edges: LineageEdge[] = [
    ...headlineIds.map((fromId) => ({
      fromId,
      toId: sharedIds[0]!,
      material: true as const,
    })),
    ...sharedIds.slice(0, -1).map((fromId, index) => ({
      fromId,
      toId: sharedIds[index + 1]!,
      material: true as const,
    })),
    { fromId: sharedIds.at(-1)!, toId: terminalId, material: true },
  ];

  const result = selectedTerminalIdsByTarget(
    graph(kinds, edges),
    headlineIds,
    [terminalId],
  );
  assert.equal(result.size, headlineIds.length);
  for (const headlineId of headlineIds) {
    assert.deepEqual(sortedValues(result, headlineId), [terminalId]);
  }
});
