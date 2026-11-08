import {
  completeWorkerTask,
  failOrRetryWorkerTask,
  requeueWorkerTaskForPoll,
} from "@/service/worker/task-queue";
import {
  isWorkerRequestAuthorized,
  parseWorkerCompleteInput,
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
    const input = parseWorkerCompleteInput(body);

    if (input.outcome === "completed") {
      const ok = await completeWorkerTask({
        taskId: id,
        workerId: input.workerId,
        outputUrl: input.outputUrl,
        stage: input.stage,
      });
      return Response.json({ ok });
    }

    if (input.outcome === "requeue") {
      const ok = await requeueWorkerTaskForPoll({
        taskId: id,
        workerId: input.workerId,
        delayMs: input.delayMs ?? 5_000,
        progress: input.progress,
        stage: input.stage,
        lane: input.lane,
      });
      return Response.json({ ok });
    }

    const status = await failOrRetryWorkerTask({
      taskId: id,
      workerId: input.workerId,
      error: input.error ?? "Worker task failed",
      permanent: input.permanent,
    });
    return Response.json({ ok: status !== "lost", status });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid complete request",
      },
      { status: 400 },
    );
  }
}
