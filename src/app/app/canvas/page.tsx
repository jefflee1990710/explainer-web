// Server Component entrypoint for the Interactive Node Canvas Editor (/app/canvas).

import { redirect } from "next/navigation";
import { requireAppUser } from "@/service/auth";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import {
  serializeCanvasProject,
  serializeCanvasProjectSummary,
} from "@/presentation/serialize/canvas";
import {
  createCanvasFromStarterTemplate,
  loadCanvasWorkspaceData,
  openCanvasProject,
} from "@/service/canvas/use-cases/workspace";
import { serializeCanvasAgentMessage } from "@/service/canvas-agent/history";
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

  if (!requestedId) {
    const templateCanvasId = await createCanvasFromStarterTemplate(
      user.clerkUserId,
      requestedTemplate,
      requestedLocale,
    );
    if (templateCanvasId) redirect(canvasPageHref(templateCanvasId, params));
  }

  const activeProject = await openCanvasProject(user.clerkUserId, requestedId);
  const canvasId = activeProject._id.toHexString();
  // The address bar names the open canvas, including the first visit with no id.
  if (requestedId !== canvasId) redirect(canvasPageHref(canvasId, params));

  const { catalog, assets, projects, agentMessages } = await loadCanvasWorkspaceData(
    user.clerkUserId,
    canvasId,
  );
  const balance = resolveUserUsdBalance(user);

  return (
    <CanvasWorkspace
      key={canvasId}
      initialProject={serializeCanvasProject(activeProject)}
      initialProjects={projects.map(serializeCanvasProjectSummary)}
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
