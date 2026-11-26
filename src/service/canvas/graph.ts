// Public graph API for the canvas. Implementation lives in graph/ so connection
// rules, input resolution, snapshot merges, and execution waves can change separately.
// Existing imports from "@/service/canvas/graph" stay valid.

export type {
  CanvasEdgeCandidate,
  EdgeValidationResult,
  ValidateEdgeConnectionOptions,
} from "@/service/canvas/graph/ports";
export {
  getNodeOutputPortType,
  reorderTargetHandleEdges,
  validateEdgeConnection,
} from "@/service/canvas/graph/ports";

export type {
  ResolvedCanvasInputs,
  ResolveNodeInputsResult,
} from "@/service/canvas/graph/inputs";
export {
  resolveNodeInputs,
  wiredSettingsVars,
} from "@/service/canvas/graph/inputs";

export type {
  CompletedCanvasOutput,
  CompletedNodeJob,
} from "@/service/canvas/graph/snapshots";
export {
  adoptServerPreview,
  applyCompletedJobOutputs,
  isNewerJob,
  mergeCanvasNodeSnapshots,
  restoreBusyNodesFromCompletedJobs,
} from "@/service/canvas/graph/snapshots";

export { computeExecutionWaves } from "@/service/canvas/graph/waves";
