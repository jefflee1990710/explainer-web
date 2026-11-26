// Nodes wired to a Scro Swap Director stay inside that director's Scro Swap group.
// Disconnecting a node takes it back out. Built trim / render / grade rows stay put.

import type { CanvasEdge, CanvasGroup, CanvasNode } from "@/model/canvas";
import { defaultGroupColor, defaultGroupTitle } from "@/service/canvas/core/groups";
import { isSwapDirectorNode, readExpandedNodeIds } from "@/service/canvas/directors/scro-director";

type MembershipNode = Pick<CanvasNode, "id" | "type" | "data">;
type MembershipEdge = Pick<CanvasEdge, "source" | "target">;

export type SwapGroupSyncOptions = {
  // A new director, or a new wire onto one, gets a Scro Swap group. An ungroup sticks until then.
  createMissing?: boolean;
};

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function swapDirectorGroup(directorId: string): CanvasGroup {
  return {
    id: `swap-dir-${directorId}`,
    title: defaultGroupTitle("swap"),
    color: defaultGroupColor("swap"),
    kind: "swap",
    memberIds: [directorId],
  };
}

// Direct wires only: inputs (source video, reference, prompt) and the output side.
function neighborIds(directorId: string, edges: readonly MembershipEdge[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    const other = edge.source === directorId ? edge.target : edge.target === directorId ? edge.source : "";
    if (!other || seen.has(other)) continue;
    seen.add(other);
    out.push(other);
  }
  return out;
}

type Bucket = {
  index: number;
  group: CanvasGroup;
  directors: MembershipNode[];
  memberIds: string[];
};

// Returns the same groups array when membership is already right, so callers can skip a save.
export function syncSwapDirectorGroupMembers(
  nodes: readonly MembershipNode[],
  edges: readonly MembershipEdge[],
  groups: readonly CanvasGroup[],
  options?: SwapGroupSyncOptions,
): CanvasGroup[] {
  const directors = nodes.filter((node) => isSwapDirectorNode(node));
  if (directors.length === 0) return groups as CanvasGroup[];

  const live = new Set(nodes.map((node) => node.id));
  const directorIds = new Set(directors.map((director) => director.id));
  const createMissing = options?.createMissing === true;
  const buckets: Bucket[] = [];

  for (const director of directors) {
    let index = groups.findIndex(
      (group) => group.kind === "swap" && group.memberIds.includes(director.id),
    );
    if (index === -1 && createMissing) {
      const id = `swap-dir-${director.id}`;
      index = groups.findIndex((group) => group.id === id);
    }
    if (index === -1 && !createMissing) continue;

    if (index === -1) {
      let bucket = buckets.find((item) => item.index === -1 && item.group.id === `swap-dir-${director.id}`);
      if (!bucket) {
        bucket = { index: -1, group: swapDirectorGroup(director.id), directors: [], memberIds: [] };
        buckets.push(bucket);
      }
      bucket.directors.push(director);
      continue;
    }

    let bucket = buckets.find((item) => item.index === index);
    if (!bucket) {
      bucket = { index, group: groups[index]!, directors: [], memberIds: [] };
      buckets.push(bucket);
    }
    bucket.directors.push(director);
  }

  if (buckets.length === 0) return groups as CanvasGroup[];

  const claimed = new Set<string>();
  for (const bucket of buckets) {
    const allowed = new Set<string>();
    const consider = (id: string) => {
      if (!live.has(id)) return;
      const inBucket = bucket.directors.some((director) => director.id === id);
      if (directorIds.has(id) && !inBucket) return;
      if (!directorIds.has(id) && claimed.has(id) && !bucket.group.memberIds.includes(id)) return;
      allowed.add(id);
    };
    for (const director of bucket.directors) {
      consider(director.id);
      for (const id of neighborIds(director.id, edges)) consider(id);
      for (const id of readExpandedNodeIds(director.data)) consider(id);
    }
    for (const id of bucket.group.memberIds) {
      if (directorIds.has(id)) consider(id);
    }

    const memberIds: string[] = [];
    const push = (id: string) => {
      if (!allowed.has(id) || memberIds.includes(id)) return;
      memberIds.push(id);
      if (!directorIds.has(id)) claimed.add(id);
    };
    for (const id of bucket.group.memberIds) push(id);
    for (const director of bucket.directors) push(director.id);
    for (const director of bucket.directors) {
      for (const id of neighborIds(director.id, edges)) push(id);
      for (const id of readExpandedNodeIds(director.data)) push(id);
    }
    bucket.memberIds = memberIds;
  }

  const owner = new Map<string, string>();
  for (const bucket of buckets) {
    for (const id of bucket.memberIds) {
      if (!owner.has(id)) owner.set(id, bucket.group.id);
    }
  }

  let changed = false;
  const result: CanvasGroup[] = [];
  for (const group of groups) {
    const bucket = buckets.find((item) => item.index !== -1 && item.group.id === group.id);
    if (bucket) {
      if (sameIds(group.memberIds, bucket.memberIds)) result.push(group);
      else {
        changed = true;
        result.push({ ...group, memberIds: bucket.memberIds });
      }
      continue;
    }
    const kept = group.memberIds.filter((id) => {
      const home = owner.get(id);
      return !home || home === group.id;
    });
    if (kept.length === 0) {
      if (group.memberIds.length > 0) changed = true;
      continue;
    }
    if (sameIds(kept, group.memberIds)) result.push(group);
    else {
      changed = true;
      result.push({ ...group, memberIds: kept });
    }
  }
  for (const bucket of buckets) {
    if (bucket.index !== -1) continue;
    changed = true;
    result.push({ ...bucket.group, memberIds: bucket.memberIds });
  }
  return changed ? result : (groups as CanvasGroup[]);
}
