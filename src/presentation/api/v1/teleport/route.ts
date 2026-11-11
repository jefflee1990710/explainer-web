import { apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import {
  listTeleportJobs,
  startTeleportJob,
} from "@/service/teleport/pipeline";
import type { TeleportStartInput } from "@/service/teleport/start-input";

// GET /api/v1/teleport — List recent Teleport scene relocation jobs.
export const GET = withApiUser(async ({ auth, request }) => {
  const limitParam = Number(new URL(request.url).searchParams.get("limit") || "24");
  const limit = Math.min(60, Math.max(1, Number.isFinite(limitParam) ? limitParam : 24));
  const jobs = await listTeleportJobs(auth.user.clerkUserId, limit);
  return apiJson({ jobs });
});

// POST /api/v1/teleport — Start a Teleport scene relocation job.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<TeleportStartInput>(request);
  return fromResult(await startTeleportJob(body), 201);
});
