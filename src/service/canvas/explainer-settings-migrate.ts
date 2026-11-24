// On load, older canvases are brought up to date: settings kinds are migrated
// (`migrateLegacySettings`), and Explainer groups with neither a Director nor a settings node
// get an idle Director built from their backing video.

import type { CanvasGroup, CanvasNode, CanvasProject } from "@/model/canvas";
import type { Project } from "@/model/project";
import { canvasProjectsCollection, videosCollection } from "@/dao";
import { explainerDirectorFromSettings, migrateLegacySettings } from "@/service/canvas/director-migrate";
import { isExplainerDirectorNode } from "@/service/canvas/explainer-director";
import { EXPLAINER_ESTIMATED_SIZE } from "@/service/canvas/explainer-layout";
import { explainerSettingsFromVideo, topicFromPlanSource } from "@/service/canvas/explainer-settings";
import { canvasGroupsForProject } from "@/service/canvas/groups";

const FRAME_ID = /-frame-\d+$/;
const COLUMN_GAP = 90;
// Explainer group ids end with the last 6 hex digits of the backing video id.
const GROUP_VIDEO_SUFFIX = /^exp-([0-9a-f]{6})$/i;

// Explainer groups with frames but no Director and no settings node.
function explainerGroupsWithoutDirector(nodes: readonly CanvasNode[], groups: readonly CanvasGroup[]): CanvasGroup[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return groups.filter((g) => {
    if (g.kind !== "explainer") return false;
    const members = g.memberIds.map((id) => byId.get(id)).filter((n): n is CanvasNode => Boolean(n));
    return (
      members.some((n) => FRAME_ID.test(n.id)) &&
      !members.some((n) => n.type === "settings" || isExplainerDirectorNode(n))
    );
  });
}

export async function ensureSettingsNodes(loaded: CanvasProject): Promise<CanvasProject> {
  const migrated = migrateLegacySettings({
    nodes: loaded.nodes,
    edges: loaded.edges,
    groups: canvasGroupsForProject(loaded.nodes, loaded.groups),
  });
  let nodes = migrated.nodes;
  let groups = migrated.groups;
  let changed = migrated.changed;

  const suffixes = new Map(
    explainerGroupsWithoutDirector(nodes, groups)
      .map((g) => [g.id, GROUP_VIDEO_SUFFIX.exec(g.id)?.[1]?.toLowerCase()] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );
  if (suffixes.size > 0) {
    const videos = await (await videosCollection())
      .find(
        { clerkUserId: loaded.clerkUserId, canvasPlanOnly: true },
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

    for (const [groupId, suffix] of suffixes) {
      const video = videos.find((v: Pick<Project, "_id">) => v._id.toHexString().endsWith(suffix));
      const group = groups.find((g) => g.id === groupId);
      const members = nodes.filter((n) => group?.memberIds.includes(n.id));
      if (!video || !group || members.length === 0) continue;
      const director = explainerDirectorFromSettings({
        groupId,
        position: {
          x: Math.min(...members.map((n) => n.position.x)) - EXPLAINER_ESTIMATED_SIZE.settings.width - COLUMN_GAP,
          y: Math.min(...members.map((n) => n.position.y)),
        },
        settings: { topic: topicFromPlanSource(video.source ?? ""), applied: explainerSettingsFromVideo(video) },
        groupParams: (group.params ?? {}) as Record<string, unknown>,
      });
      nodes = [...nodes, director];
      groups = groups.map((g) => (g.id === groupId ? { ...g, memberIds: [director.id, ...g.memberIds] } : g));
      changed = true;
    }
  }

  if (!changed) return loaded;
  return persist(loaded, { nodes, edges: migrated.edges, groups });
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
