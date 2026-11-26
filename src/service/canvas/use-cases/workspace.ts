// Loads what the /app/canvas editor needs when it opens: the canvas (migrated), the model
// catalog, library assets, the user's canvases, and the agent chat history.

import type { CanvasProject } from "@/model/canvas";
import { listCanvasAgentMessages } from "@/service/canvas-agent/history";
import { getCanvasModelCatalog } from "@/service/canvas/catalog/model-catalog";
import {
  CANVAS_STARTER_TEMPLATES,
  instantiateCanvasTemplate,
  isCanvasStarterTemplateId,
} from "@/service/canvas/core/templates";
import { ensureSettingsNodes } from "@/service/canvas/legacy/explainer-settings-migrate";
import {
  createCanvasProject,
  getOrCreateDefaultCanvasProject,
  listCanvasLibraryAssets,
  listCanvasProjects,
} from "@/service/canvas/use-cases/projects";

// Creates a canvas from a starter template id. Returns its id, or undefined for an unknown id.
export async function createCanvasFromStarterTemplate(
  clerkUserId: string,
  templateId: string | undefined,
  locale: string,
): Promise<string | undefined> {
  if (!isCanvasStarterTemplateId(templateId)) return undefined;
  const tpl = CANVAS_STARTER_TEMPLATES.find((t) => t.id === templateId);
  const { nodes, edges } = instantiateCanvasTemplate(templateId);
  const templateTitle = tpl && (locale === "zh-Hant" ? tpl.name["zh-Hant"] : tpl.name.en);
  const created = await createCanvasProject(clerkUserId, {
    title: templateTitle ?? "Template Canvas",
    nodes,
    edges,
  });
  return created._id.toHexString();
}

// Opens the requested canvas (or the default one) with older groups migrated to their settings nodes.
export async function openCanvasProject(
  clerkUserId: string,
  requestedId: string | undefined,
): Promise<CanvasProject> {
  const loadedProject = await getOrCreateDefaultCanvasProject(clerkUserId, requestedId);
  return ensureSettingsNodes(loadedProject);
}

export async function loadCanvasWorkspaceData(clerkUserId: string, canvasId: string) {
  const [catalog, assets, projects, agentMessages] = await Promise.all([
    getCanvasModelCatalog(),
    listCanvasLibraryAssets(clerkUserId),
    listCanvasProjects(clerkUserId),
    listCanvasAgentMessages(clerkUserId, canvasId),
  ]);
  return { catalog, assets, projects, agentMessages };
}
