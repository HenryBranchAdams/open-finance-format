import type { LineageGraph } from "./lineage.ts";

function compareUtf16(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareUtf16);
}

function reverseAdjacency(
  graph: LineageGraph,
): ReadonlyMap<string, readonly string[]> {
  const mutable = new Map<string, string[]>();
  for (const id of graph.nodes) mutable.set(id, []);
  for (const [dependentId, dependencyIds] of graph.adjacency) {
    for (const dependencyId of dependencyIds) {
      const dependents = mutable.get(dependencyId);
      if (dependents === undefined) {
        throw new TypeError("Lineage graph adjacency references an unknown node");
      }
      dependents.push(dependentId);
    }
  }
  const reversed = new Map<string, readonly string[]>();
  for (const [id, dependents] of mutable) {
    reversed.set(id, sortedUnique(dependents));
  }
  return reversed;
}

/**
 * Finds selected terminal dependencies reachable from demanded target nodes.
 *
 * Only demanded target result sets are retained. Traversal starts from the
 * smaller side of the target/terminal relation so shared graph regions do not
 * require a transitive set for every intermediate node.
 */
export function selectedTerminalIdsByTarget(
  graph: LineageGraph,
  targetIds: Iterable<string>,
  selectedTerminalIds: Iterable<string>,
): ReadonlyMap<string, ReadonlySet<string>> {
  const targets = sortedUnique(targetIds);
  const terminals = sortedUnique(selectedTerminalIds);
  const results = new Map<string, Set<string>>();
  for (const id of targets) results.set(id, new Set<string>());
  if (targets.length === 0 || terminals.length === 0) return results;

  if (targets.length <= terminals.length) {
    const terminalSet = new Set(terminals);
    for (const targetId of targets) {
      const reachable = results.get(targetId);
      if (reachable === undefined) continue;
      const visited = new Set<string>();
      const pending = [targetId];
      while (pending.length > 0) {
        const id = pending.pop();
        if (id === undefined || visited.has(id)) continue;
        visited.add(id);
        if (terminalSet.has(id)) {
          reachable.add(id);
          continue;
        }
        for (const dependencyId of graph.adjacency.get(id) ?? []) {
          pending.push(dependencyId);
        }
      }
    }
    return results;
  }

  const targetSet = new Set(targets);
  const dependentsByNode = reverseAdjacency(graph);
  for (const terminalId of terminals) {
    const visited = new Set<string>();
    const pending = [terminalId];
    while (pending.length > 0) {
      const id = pending.pop();
      if (id === undefined || visited.has(id)) continue;
      visited.add(id);
      if (targetSet.has(id)) results.get(id)?.add(terminalId);
      for (const dependentId of dependentsByNode.get(id) ?? []) {
        pending.push(dependentId);
      }
    }
  }
  return results;
}
