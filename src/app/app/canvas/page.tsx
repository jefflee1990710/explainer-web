// Server Component entrypoint for the Interactive Node Canvas Editor (/app/canvas).

import { redirect } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { ensureSettingsNodes } from "@/service/canvas/explainer-settings-migrate";
import { getCanvasModelCatalog } from "@/service/canvas/model-catalog";
import {
  createCanvasProject,
  getOrCreateDefaultCanvasProject,
  listCanvasLibraryAssets,
  listCanvasProjects,
  serializeCanvasProject,
  serializeCanvasProjectSummary,
} from "@/service/canvas/projects";
import {
  CANVAS_STARTER_TEMPLATES,
  instantiateCanvasTemplate,
  isCanvasStarterTemplateId,
} from "@/service/canvas/templates";
import {
  listCanvasAgentMessages,
  serializeCanvasAgentMessage,
} from "@/service/canvas-agent/history";
import { canvasPageHref } from "@/app/app/canvas/canvas-href";
import { CanvasWorkspace } from "@/app/app/canvas/canvas-workspace";
import { getRequestLocale } from "@/util/i18n/request-locale";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

export default async function CanvasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAppUser();
  const requestedLocale = await getRequestLocale();
  const params = await searchParams;
  const requestedId = firstQueryValue(params.id);
  const requestedTemplate = firstQueryValue(params.template);

  if (!requestedId && isCanvasStarterTemplateId(requestedTemplate)) {
    const tpl = CANVAS_STARTER_TEMPLATES.find((t) => t.id === requestedTemplate);
    const { nodes, edges } = instantiateCanvasTemplate(requestedTemplate);
    const templateTitle =
      tpl && (requestedLocale === "zh-Hant" ? tpl.name["zh-Hant"] : tpl.name.en);
    const created = await createCanvasProject(user.clerkUserId, {
      title: templateTitle ?? "Template Canvas",
      nodes,
      edges,
    });
    redirect(canvasPageHref(created._id.toHexString(), params));
  }

  const loadedProject = await getOrCreateDefaultCanvasProject(user.clerkUserId, requestedId);
  // Older groups get their settings nodes before the editor opens.
  const activeProject = await ensureSettingsNodes(loadedProject);
  const canvasId = activeProject._id.toHexString();
  // The address bar names the open canvas, including the first visit with no id.
  if (requestedId !== canvasId) redirect(canvasPageHref(canvasId, params));

  const [catalog, assets, allProjects, agentMessages] = await Promise.all([
    getCanvasModelCatalog(),
    listCanvasLibraryAssets(user.clerkUserId),
    listCanvasProjects(user.clerkUserId),
    listCanvasAgentMessages(user.clerkUserId, canvasId),
  ]);
  const balance = resolveUserUsdBalance(user);

  return (
    <CanvasWorkspace
      key={canvasId}
      initialProject={serializeCanvasProject(activeProject)}
      initialProjects={allProjects.map(serializeCanvasProjectSummary)}
      initialModels={catalog}
      initialAssets={assets}
      initialCreditUsd={balance.creditUsd}
      initialCreditLimitUsd={balance.creditLimitUsd}
      initialAgentMessages={agentMessages.map(serializeCanvasAgentMessage)}
    />
  );
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  return value?.[0];
}
