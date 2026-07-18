import assert from "node:assert/strict";
import test from "node:test";

import { evaluateFreshness } from "../src/freshness.ts";
import {
  analyzeLineage,
  type GraphNodeKind,
  type LineageEdge,
} from "../src/lineage.ts";

const threshold = "2026-07-17T12:00:00Z";

function graph() {
  const kinds = new Map([
    ["urn:output:headline", "output"],
    ["urn:output:shared", "output"],
    ["urn:fact:a", "sourceFact"],
    ["urn:assumption:b", "assumption"],
  ] as const);
  const result = analyzeLineage(kinds, [
    { fromId: "urn:output:headline", toId: "urn:output:shared", material: true },
    { fromId: "urn:output:headline", toId: "urn:assumption:b", material: true },
    { fromId: "urn:output:shared", toId: "urn:fact:a", material: true },
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("fixture graph must be acyclic");
  return result.graph;
}

test("freshness is current one second before and stale at/after the threshold", () => {
  const contexts = [
    ["2026-07-17T11:59:59Z", "current"],
    [threshold, "stale"],
    ["2026-07-17T12:00:01Z", "stale"],
  ] as const;
  for (const [evaluatedAt, expected] of contexts) {
    const result = evaluateFreshness({
      evaluatedAt,
      graph: graph(),
      leaves: [
        { id: "urn:fact:a", threshold, pointer: "/facts/0/staleAt" },
        { id: "urn:assumption:b", threshold, pointer: "/assumptions/0/reviewBy" },
      ],
      headlines: [{ id: "urn:output:headline", pointer: "/outputs/0" }],
    });
    assert.equal(result.leaves[0]?.status, expected);
    assert.equal(result.headlines[0]?.status, expected);
    assert.equal(result.diagnostics.length, expected === "current" ? 0 : 3);
  }
});

test("reverse propagation returns sorted unique shared stale dependencies", () => {
  const result = evaluateFreshness({
    evaluatedAt: threshold,
    graph: graph(),
    leaves: [
      { id: "urn:fact:a", threshold, pointer: "/facts/0/staleAt" },
      { id: "urn:assumption:b", threshold, pointer: "/assumptions/0/reviewBy" },
    ],
    headlines: [{ id: "urn:output:headline", pointer: "/outputs/0" }],
  });
  assert.deepEqual(result.headlines, [
    {
      entityId: "urn:output:headline",
      status: "stale",
      staleDependencyIds: ["urn:assumption:b", "urn:fact:a"],
    },
  ]);
  assert.deepEqual(result.diagnostics.at(-1), {
    code: "OFF-W5002",
    severity: "warning",
    instanceLocation: "/outputs/0",
    entityId: "urn:output:headline",
    ruleId: "OFF.FRESHNESS.HEADLINE_STALE",
    parameters: {
      evaluatedAt: threshold,
      staleDependencyIds: ["urn:assumption:b", "urn:fact:a"],
    },
  });
});

test("freshness reuses a many-leaf result through a long output chain", () => {
  const leafIds = Array.from(
    { length: 256 },
    (_, index) => `urn:fact:${index.toString().padStart(4, "0")}`,
  );
  const outputIds = Array.from(
    { length: 512 },
    (_, index) => `urn:output:${index.toString().padStart(4, "0")}`,
  );
  const kinds = new Map<string, GraphNodeKind>();
  for (const id of leafIds) kinds.set(id, "sourceFact");
  for (const id of outputIds) kinds.set(id, "output");

  const edges: LineageEdge[] = [];
  for (let index = 0; index < outputIds.length - 1; index += 1) {
    edges.push({
      fromId: outputIds[index]!,
      toId: outputIds[index + 1]!,
      material: true,
    });
  }
  for (const id of leafIds) {
    edges.push({
      fromId: outputIds.at(-1)!,
      toId: id,
      material: true,
    });
  }
  const analyzed = analyzeLineage(kinds, edges);
  assert.equal(analyzed.ok, true);
  if (!analyzed.ok) throw new Error("fixture graph must be acyclic");

  const result = evaluateFreshness({
    evaluatedAt: threshold,
    graph: analyzed.graph,
    leaves: leafIds.map((id, index) => ({
      id,
      threshold,
      pointer: `/facts/${index}/staleAt`,
    })),
    headlines: [{ id: outputIds[0]!, pointer: "/outputs/0" }],
  });

  assert.deepEqual(result.headlines, [
    {
      entityId: outputIds[0],
      status: "stale",
      staleDependencyIds: leafIds,
    },
  ]);
  assert.equal(result.leaves.length, leafIds.length);
  assert.equal(result.diagnostics.length, leafIds.length + 1);
});

test("freshness does not materialize every prefix of an accumulating chain", () => {
  const count = 512;
  const leafIds = Array.from(
    { length: count },
    (_, index) => `urn:fact:prefix:${index.toString().padStart(4, "0")}`,
  );
  const outputIds = Array.from(
    { length: count },
    (_, index) => `urn:output:prefix:${index.toString().padStart(4, "0")}`,
  );
  const kinds = new Map<string, GraphNodeKind>();
  for (const id of leafIds) kinds.set(id, "sourceFact");
  for (const id of outputIds) kinds.set(id, "output");
  const edges: LineageEdge[] = [];
  for (let index = 0; index < count; index += 1) {
    edges.push({
      fromId: outputIds[index]!,
      toId: leafIds[index]!,
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
  const analyzed = analyzeLineage(kinds, edges);
  assert.equal(analyzed.ok, true);
  if (!analyzed.ok) throw new Error("fixture graph must be acyclic");

  const result = evaluateFreshness({
    evaluatedAt: threshold,
    graph: analyzed.graph,
    leaves: leafIds.map((id, index) => ({
      id,
      threshold,
      pointer: `/facts/${index}/staleAt`,
    })),
    headlines: [{ id: outputIds[0]!, pointer: "/outputs/0" }],
  });
  assert.deepEqual(result.headlines[0]?.staleDependencyIds, leafIds);
});

test("many headlines share one long path to a stale leaf", () => {
  const headlineIds = Array.from(
    { length: 256 },
    (_, index) => `urn:headline:shared:${index.toString().padStart(4, "0")}`,
  );
  const sharedIds = Array.from(
    { length: 512 },
    (_, index) => `urn:output:shared:${index.toString().padStart(4, "0")}`,
  );
  const leafId = "urn:fact:shared:stale";
  const kinds = new Map<string, GraphNodeKind>([[leafId, "sourceFact"]]);
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
    { fromId: sharedIds.at(-1)!, toId: leafId, material: true },
  ];
  const analyzed = analyzeLineage(kinds, edges);
  assert.equal(analyzed.ok, true);
  if (!analyzed.ok) throw new Error("fixture graph must be acyclic");

  const result = evaluateFreshness({
    evaluatedAt: threshold,
    graph: analyzed.graph,
    leaves: [{ id: leafId, threshold, pointer: "/facts/0/staleAt" }],
    headlines: headlineIds.map((id, index) => ({
      id,
      pointer: `/outputs/${index}`,
    })),
  });

  assert.equal(result.headlines.length, headlineIds.length);
  assert.equal(
    result.headlines.every(
      ({ status, staleDependencyIds }) =>
        status === "stale" &&
        JSON.stringify(staleDependencyIds) === JSON.stringify([leafId]),
    ),
    true,
  );
  assert.equal(result.diagnostics.length, headlineIds.length + 1);
});
