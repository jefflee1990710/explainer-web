import type {
  PublicWorkerTask,
  WorkerTaskLane,
} from "@/model/worker-task";
import type { WorkerTaskExecutionResult } from "@/service/worker/task-executor";

export class WorkerApiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly workerId: string;
  private readonly fetchFn: typeof fetch;

  constructor(input: {
    baseUrl: string;
    apiKey: string;
    workerId: string;
    fetchFn?: typeof fetch;
  }) {
    this.baseUrl = input.baseUrl.replace(/\/+$/, "");
    this.apiKey = input.apiKey;
    this.workerId = input.workerId;
    this.fetchFn = input.fetchFn ?? fetch;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async claimTask(
    lane: WorkerTaskLane,
    leaseMs?: number,
  ): Promise<PublicWorkerTask | null> {
    const res = await this.fetchFn(`${this.baseUrl}/api/worker/tasks/claim`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        lane,
        workerId: this.workerId,
        ...(leaseMs ? { leaseMs } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`Claim failed with HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      ok: boolean;
      task?: PublicWorkerTask | null;
    };
    return data.task ?? null;
  }

  async reportProgress(
    taskId: string,
    progress?: number,
    stage?: string,
    leaseMs?: number,
  ): Promise<boolean> {
    const res = await this.fetchFn(
      `${this.baseUrl}/api/worker/tasks/${encodeURIComponent(taskId)}/progress`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          workerId: this.workerId,
          ...(typeof progress === "number" ? { progress } : {}),
          ...(stage ? { stage } : {}),
          ...(leaseMs ? { leaseMs } : {}),
        }),
      },
    );
    if (!res.ok) return false;
    const data = (await res.json().catch(() => ({ ok: false }))) as {
      ok?: boolean;
    };
    return Boolean(data.ok);
  }

  async completeTask(
    taskId: string,
    result: WorkerTaskExecutionResult,
  ): Promise<boolean> {
    const payload =
      result.outcome === "completed"
        ? {
            workerId: this.workerId,
            outcome: "completed" as const,
            outputUrl: result.outputUrl,
            stage: result.stage,
          }
        : result.outcome === "requeue"
          ? {
              workerId: this.workerId,
              outcome: "requeue" as const,
              delayMs: result.delayMs,
              progress: result.progress,
              stage: result.stage,
              lane: result.lane,
            }
          : {
              workerId: this.workerId,
              outcome: "failed" as const,
              error: result.error,
              permanent: result.permanent,
            };

    const res = await this.fetchFn(
      `${this.baseUrl}/api/worker/tasks/${encodeURIComponent(taskId)}/complete`,
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) return false;
    const data = (await res.json().catch(() => ({ ok: false }))) as {
      ok?: boolean;
    };
    return Boolean(data.ok);
  }
}
