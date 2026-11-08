import { toPublicWorkerTask } from "@/model/worker-task";
import { claimNextWorkerTask } from "@/service/worker/task-queue";
import {
  isWorkerRequestAuthorized,
  parseWorkerClaimInput,
} from "@/service/worker/worker-auth";

export async function POST(request: Request) {
  if (!isWorkerRequestAuthorized(request)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const input = parseWorkerClaimInput(body);
    const task = await claimNextWorkerTask(input);
    return Response.json({
      ok: true,
      task: task ? toPublicWorkerTask(task) : null,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid claim request",
      },
      { status: 400 },
    );
  }
}
