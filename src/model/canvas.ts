import type { ObjectId } from "mongodb";
import { z } from "zod";
import { objectIdSchema } from "@/model/primitives";
import type { CanvasModelProvider } from "@/service/canvas/model-catalog";
import type { CanvasAgentOp } from "@/service/canvas-agent/types";

export type CanvasNodeType = "media" | "prompt" | "model";
export type CanvasMediaKind = "image" | "video" | "audio";
export type CanvasAspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
export type CanvasResolution = "1k" | "2k" | "4k";
export type CanvasNodeStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed";
export type CanvasOutputKind = "image" | "video" | "audio";
export type CanvasJobStatus = "queued" | "running" | "completed" | "failed";
export type CanvasJobDomainKind = "video" | "jutsu" | "teleport" | "worker_ffmpeg";

// Serializable payload stored on each node in the Interactive Node Canvas Editor.
export type CanvasNodeData = {
  label?: string;
  // Media node fields
  mediaKind?: CanvasMediaKind;
  mediaUrl?: string;
  fileName?: string;
  // Prompt node fields
  text?: string;
  // Model node fields
  modelId?: string;
  presetId?: string;
  prompt?: string;
  negativePrompt?: string;
  aspectRatio?: CanvasAspectRatio;
  resolution?: CanvasResolution;
  durationSeconds?: number;
  seed?: number;
  toolParams?: Record<string, unknown>;
  // Execution state cached on node for instant reload
  status?: CanvasNodeStatus;
  lastJobId?: string;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  lastError?: string;
  lastCostUsd?: number;
};

export type CanvasNode = {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: CanvasNodeData;
};

export type CanvasEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};

export type CanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};

// Persisted multi-project canvas document in the `canvas_projects` collection.
export type CanvasProject = {
  _id: ObjectId;
  clerkUserId: string;
  title: string;
  thumbnailUrl?: string;
  viewport: CanvasViewport;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  createdAt: Date;
  updatedAt: Date;
};

// Execution audit trail & billing record in the `canvas_jobs` collection.
export type CanvasJob = {
  _id: ObjectId;
  clerkUserId: string;
  canvasId: ObjectId;
  nodeId: string;
  flowRunId?: string;
  provider: CanvasModelProvider;
  modelId: string;
  providerModelId: string;
  presetId?: string;
  status: CanvasJobStatus;
  domainKind?: CanvasJobDomainKind;
  externalJobId?: string;
  statusUrl?: string;
  inputSnapshot: Record<string, unknown>;
  chargedUsd: number;
  spendEventKey?: string;
  refundedAt?: Date;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

// One chat message with the canvas agent, stored per canvas in `canvas_agent_messages`.
export type CanvasAgentMessage = {
  _id: ObjectId;
  canvasId: ObjectId;
  clerkUserId: string;
  role: "user" | "assistant";
  text: string;
  language: string;
  // Graph edits made during this assistant turn (shown as chips with Undo).
  ops?: CanvasAgentOp[];
  createdAt: Date;
};

export const canvasNodeTypeSchema = z.enum(["media", "prompt", "model"]);
export const canvasMediaKindSchema = z.enum(["image", "video", "audio"]);
export const canvasAspectRatioSchema = z.enum([
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "3:4",
]);
export const canvasResolutionSchema = z.enum(["1k", "2k", "4k"]);
export const canvasNodeStatusSchema = z.enum([
  "idle",
  "queued",
  "running",
  "completed",
  "failed",
]);
export const canvasOutputKindSchema = z.enum(["image", "video", "audio"]);
export const canvasJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);
export const canvasJobDomainKindSchema = z.enum([
  "video",
  "jutsu",
  "teleport",
  "worker_ffmpeg",
]);
export const canvasModelProviderSchema = z.enum([
  "mentalok",
  "openrouter",
  "scro",
  "ffmpeg",
]);

export const canvasNodeDataSchema: z.ZodType<CanvasNodeData> = z.object({
  label: z.string().optional(),
  mediaKind: canvasMediaKindSchema.optional(),
  mediaUrl: z.string().optional(),
  fileName: z.string().optional(),
  text: z.string().optional(),
  modelId: z.string().optional(),
  presetId: z.string().optional(),
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),
  aspectRatio: canvasAspectRatioSchema.optional(),
  resolution: canvasResolutionSchema.optional(),
  durationSeconds: z.number().finite().positive().optional(),
  seed: z.number().int().optional(),
  toolParams: z.record(z.string(), z.unknown()).optional(),
  status: canvasNodeStatusSchema.optional(),
  lastJobId: z.string().optional(),
  outputUrl: z.string().optional(),
  outputKind: canvasOutputKindSchema.optional(),
  lastError: z.string().optional(),
  lastCostUsd: z.number().finite().nonnegative().optional(),
});

export const canvasNodeSchema: z.ZodType<CanvasNode> = z.object({
  id: z.string().min(1),
  type: canvasNodeTypeSchema,
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  data: canvasNodeDataSchema,
});

export const canvasEdgeSchema: z.ZodType<CanvasEdge> = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  sourceHandle: z.string().min(1),
  target: z.string().min(1),
  targetHandle: z.string().min(1),
});

export const canvasViewportSchema: z.ZodType<CanvasViewport> = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  zoom: z.number().finite().positive(),
});

export const canvasProjectSchema: z.ZodType<CanvasProject> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string().min(1),
  title: z.string().min(1),
  thumbnailUrl: z.string().optional(),
  viewport: canvasViewportSchema,
  nodes: z.array(canvasNodeSchema),
  edges: z.array(canvasEdgeSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const canvasJobSchema: z.ZodType<CanvasJob> = z.object({
  _id: objectIdSchema,
  clerkUserId: z.string().min(1),
  canvasId: objectIdSchema,
  nodeId: z.string().min(1),
  flowRunId: z.string().optional(),
  provider: canvasModelProviderSchema,
  modelId: z.string().min(1),
  providerModelId: z.string().min(1),
  presetId: z.string().optional(),
  status: canvasJobStatusSchema,
  domainKind: canvasJobDomainKindSchema.optional(),
  externalJobId: z.string().optional(),
  statusUrl: z.string().optional(),
  inputSnapshot: z.record(z.string(), z.unknown()),
  chargedUsd: z.number().finite().nonnegative(),
  spendEventKey: z.string().optional(),
  refundedAt: z.date().optional(),
  outputUrl: z.string().optional(),
  outputKind: canvasOutputKindSchema.optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
