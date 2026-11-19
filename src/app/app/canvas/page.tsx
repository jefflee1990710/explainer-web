// Server Component entrypoint for the Interactive Node Canvas Editor (/app/canvas).

import { requireAppUser } from "@/service/auth";
import { resolveUserUsdBalance } from "@/service/billing/credit-balance";
import { getCanvasModelCatalog } from "@/service/canvas/model-catalog";
import {
  getOrCreateDefaultCanvasProject,
  listCanvasLibraryAssets,
  listCanvasProjects,
  serializeCanvasProject,
  serializeCanvasProjectSummary,
} from "@/service/canvas/projects";
import { CanvasWorkspace } from "@/app/app/canvas/canvas-workspace";

export const dynamic = "force-dynamic";

export default async function CanvasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await requireAppUser();
  const params = await searchParams;
  const requestedId = typeof params.id === "string" ? params.id : undefined;

  const [activeProject, catalog, assets] = await Promise.all([
    getOrCreateDefaultCanvasProject(user.clerkUserId, requestedId),
    getCanvasModelCatalog(),
    listCanvasLibraryAssets(user.clerkUserId),
  ]);

  const allProjects = await listCanvasProjects(user.clerkUserId);
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
    />
  );
}
