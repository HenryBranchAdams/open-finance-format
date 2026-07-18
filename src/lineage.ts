export type GraphNodeKind = "output" | "sourceFact" | "assumption";

export interface LineageEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly material: true;
}

export interface LineageGraph {
  readonly nodes: readonly string[];
  readonly edges: readonly LineageEdge[];
  readonly adjacency: ReadonlyMap<string, readonly string[]>;
  readonly topologicalOrder: readonly string[];
}

export type LineageAnalysis =
  | { readonly ok: true; readonly graph: LineageGraph }
  | { readonly ok: false; readonly cycleEntityIds: readonly string[] };

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareUtf16);
}

class StringMinHeap {
  private readonly values: string[] = [];

  get size(): number {
    return this.values.length;
  }

  push(value: string): void {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      const parentValue = this.values[parent];
      if (parentValue === undefined || compareUtf16(parentValue, value) <= 0) break;
      this.values[index] = parentValue;
      index = parent;
    }
    this.values[index] = value;
  }

  pop(): string | undefined {
    const first = this.values[0];
    const last = this.values.pop();
    if (first === undefined || last === undefined || this.values.length === 0) {
      return first;
    }
    let index = 0;
    this.values[0] = last;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      const leftValue = this.values[left];
      const smallestValue = this.values[smallest];
      if (
        leftValue !== undefined &&
        smallestValue !== undefined &&
        compareUtf16(leftValue, smallestValue) < 0
      ) {
        smallest = left;
      }
      const rightValue = this.values[right];
      const currentSmallest = this.values[smallest];
      if (
        rightValue !== undefined &&
        currentSmallest !== undefined &&
        compareUtf16(rightValue, currentSmallest) < 0
      ) {
        smallest = right;
      }
      if (smallest === index) break;
      const swap = this.values[index];
      const replacement = this.values[smallest];
      if (swap === undefined || replacement === undefined) break;
      this.values[index] = replacement;
      this.values[smallest] = swap;
      index = smallest;
    }
    return first;
  }
}

function stableCycleWitness(
  remaining: ReadonlySet<string>,
  adjacency: ReadonlyMap<string, readonly string[]>,
): string[] {
  const color = new Map<string, 0 | 1 | 2>();
  interface Frame {
    readonly id: string;
    next: number;
  }

  for (const start of [...remaining].sort(compareUtf16)) {
    if ((color.get(start) ?? 0) !== 0) continue;
    const stack: Frame[] = [{ id: start, next: 0 }];
    color.set(start, 1);
    while (stack.length > 0) {
      const frame = stack.at(-1);
      if (frame === undefined) break;
      const neighbors = adjacency.get(frame.id) ?? [];
      const neighbor = neighbors[frame.next];
      if (neighbor === undefined) {
        color.set(frame.id, 2);
        stack.pop();
        continue;
      }
      frame.next += 1;
      if (!remaining.has(neighbor)) continue;
      const neighborColor = color.get(neighbor) ?? 0;
      if (neighborColor === 0) {
        color.set(neighbor, 1);
        stack.push({ id: neighbor, next: 0 });
      } else if (neighborColor === 1) {
        const cycleStart = stack.findIndex(({ id }) => id === neighbor);
        return sortedUnique(stack.slice(cycleStart).map(({ id }) => id));
      }
    }
  }
  return [...remaining].sort(compareUtf16);
}

export function analyzeLineage(
  nodeKinds: ReadonlyMap<string, GraphNodeKind>,
  inputEdges: readonly LineageEdge[],
): LineageAnalysis {
  const nodes = [...nodeKinds.keys()].sort(compareUtf16);
  const edges = [...inputEdges].sort(
    (left, right) =>
      compareUtf16(left.fromId, right.fromId) ||
      compareUtf16(left.toId, right.toId),
  );
  const mutableAdjacency = new Map<string, string[]>();
  const indegree = new Map(nodes.map((id) => [id, 0]));
  for (const id of nodes) mutableAdjacency.set(id, []);
  for (const edge of edges) {
    if (!nodeKinds.has(edge.fromId) || !nodeKinds.has(edge.toId)) {
      throw new TypeError("Lineage analysis requires all edge endpoints to be indexed");
    }
    mutableAdjacency.get(edge.fromId)?.push(edge.toId);
    indegree.set(edge.toId, (indegree.get(edge.toId) ?? 0) + 1);
  }
  const adjacency = new Map<string, readonly string[]>();
  for (const id of nodes) {
    adjacency.set(id, sortedUnique(mutableAdjacency.get(id) ?? []));
  }

  const ready = new StringMinHeap();
  for (const id of nodes) if (indegree.get(id) === 0) ready.push(id);
  const topologicalOrder: string[] = [];
  while (ready.size > 0) {
    const id = ready.pop();
    if (id === undefined) break;
    topologicalOrder.push(id);
    for (const dependency of adjacency.get(id) ?? []) {
      const next = (indegree.get(dependency) ?? 0) - 1;
      indegree.set(dependency, next);
      if (next === 0) ready.push(dependency);
    }
  }

  if (topologicalOrder.length !== nodes.length) {
    const emitted = new Set(topologicalOrder);
    const remaining = new Set(nodes.filter((id) => !emitted.has(id)));
    return {
      ok: false,
      cycleEntityIds: stableCycleWitness(remaining, adjacency),
    };
  }
  return {
    ok: true,
    graph: { nodes, edges, adjacency, topologicalOrder },
  };
}

export function findUnterminatedNodes(
  graph: LineageGraph,
  nodeKinds: ReadonlyMap<string, GraphNodeKind>,
  headlineId: string,
): string[] {
  const unterminated = new Set<string>();
  const visited = new Set<string>();
  const pending = [headlineId];
  while (pending.length > 0) {
    const id = pending.pop();
    if (id === undefined || visited.has(id)) continue;
    visited.add(id);
    const dependencies = graph.adjacency.get(id) ?? [];
    if (dependencies.length === 0) {
      if (nodeKinds.get(id) === "output") unterminated.add(id);
      continue;
    }
    for (let index = dependencies.length - 1; index >= 0; index -= 1) {
      const dependency = dependencies[index];
      if (dependency !== undefined) pending.push(dependency);
    }
  }
  return [...unterminated].sort(compareUtf16);
}
