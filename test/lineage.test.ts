import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeLineage,
  findUnterminatedNodes,
  type LineageEdge,
} from "../src/lineage.ts";

test("lineage is dependent-to-dependency and stable across edge order", () => {
  const kinds = new Map([
    ["urn:output:headline", "output"],
    ["urn:output:intermediate", "output"],
    ["urn:fact:a", "sourceFact"],
    ["urn:assumption:b", "assumption"],
  ] as const);
  const edges: LineageEdge[] = [
    { fromId: "urn:output:headline", toId: "urn:output:intermediate", material: true },
    { fromId: "urn:output:headline", toId: "urn:assumption:b", material: true },
    { fromId: "urn:output:intermediate", toId: "urn:fact:a", material: true },
  ];

  const first = analyzeLineage(kinds, edges);
  const second = analyzeLineage(kinds, [...edges].reverse());
  assert.equal(first.ok, true);
  assert.deepEqual(second, first);
  if (first.ok) {
    assert.deepEqual(first.graph.topologicalOrder, [
      "urn:output:headline",
      "urn:assumption:b",
      "urn:output:intermediate",
      "urn:fact:a",
    ]);
    assert.deepEqual(
      findUnterminatedNodes(first.graph, kinds, "urn:output:headline"),
      [],
    );
  }
});

test("two cycles yield one deterministic actual cycle witness", () => {
  const kinds = new Map([
    ["urn:output:a", "output"],
    ["urn:output:b", "output"],
    ["urn:output:c", "output"],
    ["urn:output:d", "output"],
  ] as const);
  const edges: LineageEdge[] = [
    { fromId: "urn:output:c", toId: "urn:output:d", material: true },
    { fromId: "urn:output:d", toId: "urn:output:c", material: true },
    { fromId: "urn:output:b", toId: "urn:output:a", material: true },
    { fromId: "urn:output:a", toId: "urn:output:b", material: true },
  ];
  const expected = {
    ok: false,
    cycleEntityIds: ["urn:output:a", "urn:output:b"],
  } as const;
  assert.deepEqual(analyzeLineage(kinds, edges), expected);
  assert.deepEqual(analyzeLineage(kinds, [...edges].reverse()), expected);
});

test("long lineage chains are analyzed without recursion", () => {
  const count = 10_000;
  const kinds = new Map<string, "output" | "sourceFact">();
  const edges: LineageEdge[] = [];
  for (let index = 0; index < count; index += 1) {
    kinds.set(`urn:output:${String(index).padStart(5, "0")}`, "output");
    if (index + 1 < count) {
      edges.push({
        fromId: `urn:output:${String(index).padStart(5, "0")}`,
        toId: `urn:output:${String(index + 1).padStart(5, "0")}`,
        material: true,
      });
    }
  }
  kinds.set("urn:fact:terminal", "sourceFact");
  edges.push({
    fromId: `urn:output:${String(count - 1).padStart(5, "0")}`,
    toId: "urn:fact:terminal",
    material: true,
  });

  const result = analyzeLineage(kinds, edges);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.graph.topologicalOrder.length, count + 1);
    assert.deepEqual(
      findUnterminatedNodes(result.graph, kinds, "urn:output:00000"),
      [],
    );
  }
});

test("terminal coverage identifies reachable outputs with no dependencies", () => {
  const kinds = new Map([
    ["urn:output:headline", "output"],
    ["urn:output:dead-end", "output"],
  ] as const);
  const result = analyzeLineage(kinds, [
    { fromId: "urn:output:headline", toId: "urn:output:dead-end", material: true },
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(
      findUnterminatedNodes(result.graph, kinds, "urn:output:headline"),
      ["urn:output:dead-end"],
    );
  }
});
