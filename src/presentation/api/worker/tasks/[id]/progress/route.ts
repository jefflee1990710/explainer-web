import { updateWorkerTaskProgress } from "@/service/worker/task-queue";
import {
  isWorkerRequestAuthorized,
  parseWorkerProgressInput,
} from "@/service/worker/worker-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isWorkerRequestAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    const body = await request.json();
    const input = parseWorkerProgressInput(body);
    const updated = await updateWorkerTaskProgress({
      taskId: id,
      workerId: input.workerId,
      progress: input.progress,
      stage: input.stage,
      leaseMs: input.leaseMs,
    });
    return Response.json({ ok: updated });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid progress request",
      },
      { status: 400 },
    );
  }
}
