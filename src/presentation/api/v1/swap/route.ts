import { apiJson, fromResult, readJson, withApiUser } from "@/service/api/respond";
import {
  listJutsuJobs,
  prepareJutsuJob,
  renderJutsuVideo,
  startScroSwapJob,
  type PrepareJutsuJobInput,
  type StartScroSwapInput,
} from "@/service/jutsu/pipeline";

// GET /api/v1/swap — List recent Scro Swap jobs for the authenticated account.
export const GET = withApiUser(async ({ auth, request }) => {
  const limitParam = Number(new URL(request.url).searchParams.get("limit") || "24");
  const limit = Math.min(60, Math.max(1, Number.isFinite(limitParam) ? limitParam : 24));
  const jobs = await listJutsuJobs(auth.user.clerkUserId, limit);
  return apiJson({ jobs });
});

// POST /api/v1/swap — Start a 1-step Scro Swap job, or run two-step prepare / render when `action` is specified.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<
    StartScroSwapInput &
      PrepareJutsuJobInput & {
        action?: "start" | "prepare" | "render";
        jobId?: string;
        motionDescription?: string;
      }
  >(request);

  if (body.action === "prepare") {
    return fromResult(await prepareJutsuJob(body), 201);
  }
  if (body.action === "render" && body.jobId) {
    return fromResult(
      await renderJutsuVideo({
        jobId: body.jobId,
        motionDescription: body.motionDescription,
        keepSourceAudio: body.keepSourceAudio,
        applyColorFix: body.applyColorFix,
      }),
    );
  }
  return fromResult(await startScroSwapJob(body), 201);
});
