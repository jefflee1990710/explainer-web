// Contract for one canvas provider: how its jobs are checked, sent, and polled.
// Submit, dispatch, and poll look the adapter up by `spec.provider` / `job.provider`.

import type { CanvasJob, CanvasNode } from "@/model/canvas";
import type { CanvasModelProvider, CanvasModelSpec } from "@/model/canvas-model";
import type { ResolvedCanvasInputs } from "@/service/canvas/core/graph";
import type {
  CanvasExecutorDeps,
  SubmitCanvasNodeJobResult,
} from "@/service/canvas/execution/jobs/deps";

export type CanvasDispatchContext = {
  initialJob: CanvasJob;
  spec: CanvasModelSpec;
  node: CanvasNode;
  inputs: ResolvedCanvasInputs;
  presetId: string;
  clerkUserId: string;
  canvasIdHex: string;
  jobIdHex: string;
  resolved: CanvasExecutorDeps;
};

export type CanvasProviderInputCheck =
  | { ok: true }
  | { ok: false; reason: string; missingRequiredFields?: string[] };

export type CanvasProviderAdapter = {
  provider: CanvasModelProvider;
  // Error shown when the provider cannot run (usually a missing API key). Checked before any charge.
  credentialError?: (spec: CanvasModelSpec, resolved: CanvasExecutorDeps) => string | undefined;
  // Provider-specific input rules, checked after the graph resolves inputs and before any charge.
  validateInputs?: (
    spec: CanvasModelSpec,
    node: CanvasNode,
    inputs: ResolvedCanvasInputs,
  ) => CanvasProviderInputCheck;
  // true: the job preset must be one of the model's presets; false: the aspect ratio is the preset.
  presetFromCatalog: boolean;
  // Sends the queued job. Thrown errors fail the job and refund it.
  dispatch: (ctx: CanvasDispatchContext) => Promise<SubmitCanvasNodeJobResult>;
  // Reads a running job once and settles it when the provider has finished.
  poll: (job: CanvasJob, resolved: CanvasExecutorDeps) => Promise<CanvasJob>;
};
