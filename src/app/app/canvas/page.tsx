// Server Component entrypoint for the Interactive Node Canvas Editor (/app/canvas).

import { redirect } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
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
import { CanvasWorkspace } from "@/app/app/canvas/canvas-workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

export default async function CanvasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; template?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const requestedId = typeof params.id === "string" ? params.id : undefined;
  const requestedTemplate =
    typeof params.template === "string" ? params.template : undefined;

  if (!requestedId && isCanvasStarterTemplateId(requestedTemplate)) {
    const tpl = CANVAS_STARTER_TEMPLATES.find((t) => t.id === requestedTemplate);
    const { nodes, edges } = instantiateCanvasTemplate(requestedTemplate);
    const created = await createCanvasProject(user.clerkUserId, {
      title: tpl?.name["zh-Hant"] ?? "Template Canvas",
      nodes,
      edges,
    });
    redirect(`/app/canvas?id=${created._id.toHexString()}`);
  }

  const [activeProject, catalog, assets] = await Promise.all([
    getOrCreateDefaultCanvasProject(user.clerkUserId, requestedId),
    getCanvasModelCatalog(),
    listCanvasLibraryAssets(user.clerkUserId),
  ]);

  const [allProjects, agentMessages] = await Promise.all([
    listCanvasProjects(user.clerkUserId),
    listCanvasAgentMessages(user.clerkUserId, activeProject._id.toHexString()),
  ]);
  const balance = resolveUserUsdBalance(user);

  return (
    <CanvasWorkspace
      key={activeProject._id.toHexString()}
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
