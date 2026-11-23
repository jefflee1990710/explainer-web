// On load, older canvases get their settings nodes: Explainer (from the backing video)
// and Swap / Teleport (from their own nodes).

import type { CanvasEdge, CanvasGroup, CanvasNode, CanvasProject } from "@/model/canvas";
import type { ExplainerSettingsNodeData } from "@/model/explainer-settings";
import type { Project } from "@/model/project";
import { canvasProjectsCollection, videosCollection } from "@/dao";
import { EXPLAINER_ESTIMATED_SIZE } from "@/service/canvas/explainer-layout";
import {
  buildExplainerSettingsNode,
  explainerSettingsEdges,
  explainerSettingsFromVideo,
  topicFromPlanSource,
} from "@/service/canvas/explainer-settings";
import { canvasGroupsForProject } from "@/service/canvas/groups";
import { upgradeLegacySettingsNodes, withToolSettingsNodes } from "@/service/canvas/settings/migrate";

const FRAME_ID = /-frame-\d+$/;
const COLUMN_GAP = 90;
// Explainer group ids end with the last 6 hex digits of the backing video id.
const GROUP_VIDEO_SUFFIX = /^exp-([0-9a-f]{6})$/i;

export function explainerGroupsMissingSettings(
  nodes: readonly CanvasNode[],
  groups: readonly CanvasGroup[],
): CanvasGroup[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return groups.filter((g) => {
    if (g.kind !== "explainer") return false;
    const members = g.memberIds.map((id) => byId.get(id)).filter((n): n is CanvasNode => Boolean(n));
    return members.some((n) => FRAME_ID.test(n.id)) && !members.some((n) => n.type === "settings");
  });
}

export function withExplainerSettingsNodes(
  graph: { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[]; groups: readonly CanvasGroup[] },
  dataByGroupId: ReadonlyMap<string, ExplainerSettingsNodeData>,
): { nodes: CanvasNode[]; edges: CanvasEdge[]; groups: CanvasGroup[]; changed: boolean } {
  const nodes = [...graph.nodes];
  const edges = [...graph.edges];
  let changed = false;
  const groups = graph.groups.map((g) => {
    const data = dataByGroupId.get(g.id);
    if (!data) return g;
    const members = nodes.filter((n) => g.memberIds.includes(n.id));
    if (members.length === 0) return g;
    const settings = buildExplainerSettingsNode({
      groupId: g.id,
      position: {
        x: Math.min(...members.map((n) => n.position.x)) - EXPLAINER_ESTIMATED_SIZE.settings.width - COLUMN_GAP,
        y: Math.min(...members.map((n) => n.position.y)),
      },
      data,
    });
    nodes.push(settings);
    edges.push(...explainerSettingsEdges(g.id, members.filter((n) => FRAME_ID.test(n.id)).map((n) => n.id)));
    changed = true;
    return { ...g, memberIds: [settings.id, ...g.memberIds] };
  });
  return { nodes, edges, groups, changed };
}

// Adds missing settings nodes and saves them: Explainer groups read their backing video
// (groups whose video is gone stay as they are); Swap / Teleport groups read their own nodes.
export async function ensureSettingsNodes(loaded: CanvasProject): Promise<CanvasProject> {
  const upgraded = upgradeLegacySettingsNodes(loaded.nodes);
  const tool = withToolSettingsNodes({
    nodes: upgraded.nodes,
    edges: loaded.edges,
    groups: canvasGroupsForProject(upgraded.nodes, loaded.groups),
  });
  const project: CanvasProject =
    upgraded.changed || tool.changed
      ? { ...loaded, nodes: tool.nodes, edges: tool.edges, ...(tool.changed ? { groups: tool.groups } : {}) }
      : loaded;
  const dirty = upgraded.changed || tool.changed;
  const save = (p: CanvasProject) =>
    persist(p, { nodes: p.nodes, edges: p.edges, ...(p.groups ? { groups: p.groups } : {}) });

  const groups = canvasGroupsForProject(project.nodes, project.groups);
  const missing = explainerGroupsMissingSettings(project.nodes, groups);
  const suffixes = new Map(
    missing
      .map((g) => [g.id, GROUP_VIDEO_SUFFIX.exec(g.id)?.[1]?.toLowerCase()] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
  if (suffixes.size === 0) return dirty ? save(project) : project;

  const videos = await (await videosCollection())
    .find(
      { clerkUserId: project.clerkUserId, canvasPlanOnly: true },
      {
        projection: {
          skillSlug: 1,
          directorBackgroundId: 1,
          onScreenTextStyleId: 1,
          textStyleId: 1,
          subtitleLook: 1,
          sceneTextEnabled: 1,
          sceneTextLanguage: 1,
          source: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(500)
    .toArray();

  const dataByGroupId = new Map<string, ExplainerSettingsNodeData>();
  for (const [groupId, suffix] of suffixes) {
    const video = videos.find((v: Pick<Project, "_id">) => v._id.toHexString().endsWith(suffix));
    if (!video) continue;
    dataByGroupId.set(groupId, {
      plannerVideoId: video._id.toHexString(),
      topic: topicFromPlanSource(video.source ?? ""),
      applied: explainerSettingsFromVideo(video),
    });
  }
  const next = withExplainerSettingsNodes({ nodes: project.nodes, edges: project.edges, groups }, dataByGroupId);
  if (!next.changed) return dirty ? save(project) : project;
  return save({ ...project, nodes: next.nodes, edges: next.edges, groups: next.groups });
}

async function persist(
  project: CanvasProject,
  patch: Partial<Pick<CanvasProject, "nodes" | "edges" | "groups">>,
): Promise<CanvasProject> {
  const updatedAt = new Date();
  await (await canvasProjectsCollection()).updateOne(
    { _id: project._id, clerkUserId: project.clerkUserId },
    { $set: { ...patch, updatedAt } },
  );
  return { ...project, ...patch, updatedAt };
}
