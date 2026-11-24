// Multi-project MongoDB CRUD, DTO serialization, and Scro library asset aggregation
// for the Interactive Node Canvas Editor (/app/canvas).

import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  canvasJobsCollection,
  canvasProjectsCollection,
  charactersCollection,
  productsCollection,
} from "@/dao";
import {
  type CanvasEdge,
  type CanvasGroup,
  type CanvasJob,
  type CanvasJobStatus,
  type CanvasNode,
  type CanvasOutputKind,
  type CanvasProject,
  type CanvasViewport,
  canvasEdgeSchema,
  canvasGroupSchema,
  canvasNodeSchema,
  canvasViewportSchema,
} from "@/model/canvas";
import type { Character } from "@/model/character";
import { listCustomWardrobeItems } from "@/service/character/custom-wardrobe";
import { mergeCanvasNodeSnapshots } from "@/service/canvas/graph";
import { canvasGroupsForProject } from "@/service/canvas/groups";
import { failOrphanBusyNodes } from "@/service/canvas/orphan-busy";
import { upgradeLegacySettingsNodes } from "@/service/canvas/settings/migrate";
import type { CanvasModelProvider } from "@/service/canvas/model-catalog";

export const DEFAULT_CANVAS_TITLE = "Untitled Canvas";
export const CANVAS_TITLE_MAX_LENGTH = 120;
export const DEFAULT_CANVAS_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };

export type CanvasProjectSummaryDto = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CanvasFlowRunDto = {
  flowRunId: string;
  status: "running" | "completed" | "failed" | "stopped";
  currentWave: number;
  totalWaves: number;
  failedNodeIds: string[];
  error?: string;
};

export type CanvasProjectDto = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  viewport: CanvasViewport;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  groups: CanvasGroup[];
  activeFlowRun?: CanvasFlowRunDto;
  createdAt: string;
  updatedAt: string;
};

export type CanvasJobDto = {
  id: string;
  canvasId: string;
  nodeId: string;
  flowRunId?: string;
  provider: CanvasModelProvider;
  modelId: string;
  providerModelId: string;
  presetId?: string;
  status: CanvasJobStatus;
  externalJobId?: string;
  chargedUsd: number;
  refundedAt?: string;
  outputUrl?: string;
  outputKind?: CanvasOutputKind;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type CanvasLibraryAsset = {
  id: string;
  source: "character" | "product" | "canvas_output" | "outfit";
  name: string;
  mediaKind: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  // Set on outfit tiles so a drop lands on the matching character input.
  outfitPart?: "hair" | "top" | "pants" | "shoes" | "accessory" | "look";
  outfitPrompt?: string;
  characterId?: string;
};

export type CanvasLibraryCharacterOption = {
  id: string;
  name: string;
  previewUrl?: string;
};

export type CanvasLibraryAssetsResult = {
  characters: CanvasLibraryAsset[];
  outfits: CanvasLibraryAsset[];
  products: CanvasLibraryAsset[];
  recentOutputs: CanvasLibraryAsset[];
  characterOptions: CanvasLibraryCharacterOption[];
};

export type CreateCanvasProjectInput = {
  title?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  viewport?: CanvasViewport;
  thumbnailUrl?: string;
};

export type SaveCanvasProjectPatch = {
  title?: string;
  nodes?: CanvasNode[];
  edges?: CanvasEdge[];
  groups?: CanvasGroup[];
  viewport?: CanvasViewport;
  thumbnailUrl?: string;
};

const nodesArraySchema = z.array(canvasNodeSchema);
const edgesArraySchema = z.array(canvasEdgeSchema);
const groupsArraySchema = z.array(canvasGroupSchema).max(200);

function normalizeCanvasTitle(raw?: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return DEFAULT_CANVAS_TITLE;
  return trimmed.slice(0, CANVAS_TITLE_MAX_LENGTH);
}

// Serializes a MongoDB CanvasProject into a plain JSON-safe DTO for Client Components.
export function serializeCanvasProject(project: CanvasProject): CanvasProjectDto {
  return {
    id: project._id.toHexString(),
    title: project.title,
    ...(project.thumbnailUrl ? { thumbnailUrl: project.thumbnailUrl } : {}),
    viewport: project.viewport,
    nodes: failOrphanBusyNodes(project.nodes, project.activeFlowRun?.status === "running"),
    edges: project.edges,
    groups: canvasGroupsForProject(project.nodes, project.groups),
    ...(project.activeFlowRun
      ? {
          activeFlowRun: {
            flowRunId: project.activeFlowRun.flowRunId,
            status: project.activeFlowRun.status,
            currentWave: project.activeFlowRun.currentWave,
            totalWaves: project.activeFlowRun.totalWaves,
            failedNodeIds: project.activeFlowRun.failedNodeIds ?? [],
            ...(project.activeFlowRun.error ? { error: project.activeFlowRun.error } : {}),
          },
        }
      : {}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// Serializes a CanvasProject into a lightweight list item for the project switcher dropdown.
export function serializeCanvasProjectSummary(
  project: CanvasProject,
): CanvasProjectSummaryDto {
  return {
    id: project._id.toHexString(),
    title: project.title,
    ...(project.thumbnailUrl ? { thumbnailUrl: project.thumbnailUrl } : {}),
    nodeCount: project.nodes.length,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// Serializes a MongoDB CanvasJob into a plain JSON-safe DTO for Server Actions.
export function serializeCanvasJob(job: CanvasJob): CanvasJobDto {
  return {
    id: job._id.toHexString(),
    canvasId: job.canvasId.toHexString(),
    nodeId: job.nodeId,
    ...(job.flowRunId ? { flowRunId: job.flowRunId } : {}),
    provider: job.provider,
    modelId: job.modelId,
    providerModelId: job.providerModelId,
    ...(job.presetId ? { presetId: job.presetId } : {}),
    status: job.status,
    ...(job.externalJobId ? { externalJobId: job.externalJobId } : {}),
    chargedUsd: job.chargedUsd,
    ...(job.refundedAt ? { refundedAt: job.refundedAt.toISOString() } : {}),
    ...(job.outputUrl ? { outputUrl: job.outputUrl } : {}),
    ...(job.outputKind ? { outputKind: job.outputKind } : {}),
    ...(job.error ? { error: job.error } : {}),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

// Lists all canvas projects owned by the user, newest updated first.
export async function listCanvasProjects(
  clerkUserId: string,
): Promise<CanvasProject[]> {
  const projects = await canvasProjectsCollection();
  return projects.find({ clerkUserId }).sort({ updatedAt: -1 }).toArray();
}

// Creates a new canvas project owned by `clerkUserId`.
export async function createCanvasProject(
  clerkUserId: string,
  input?: CreateCanvasProjectInput,
): Promise<CanvasProject> {
  const projects = await canvasProjectsCollection();
  const now = new Date();
  const nodes = input?.nodes ? nodesArraySchema.parse(input.nodes) : [];
  const edges = input?.edges ? edgesArraySchema.parse(input.edges) : [];
  const viewport = input?.viewport
    ? canvasViewportSchema.parse(input.viewport)
    : { ...DEFAULT_CANVAS_VIEWPORT };

  const doc: CanvasProject = {
    _id: new ObjectId(),
    clerkUserId,
    title: normalizeCanvasTitle(input?.title),
    ...(input?.thumbnailUrl?.trim()
      ? { thumbnailUrl: input.thumbnailUrl.trim() }
      : {}),
    viewport,
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };

  await projects.insertOne(doc);
  return doc;
}

// Loads a specific canvas project by ID (if valid and owned), or falls back to the
// user's most recently updated project, creating a default canvas if none exist yet.
export async function getOrCreateDefaultCanvasProject(
  clerkUserId: string,
  canvasId?: string,
): Promise<CanvasProject> {
  const projects = await canvasProjectsCollection();

  if (canvasId && ObjectId.isValid(canvasId)) {
    const requested = await projects.findOne({
      _id: new ObjectId(canvasId),
      clerkUserId,
    });
    if (requested) {
      return requested;
    }
  }

  const latest = await projects
    .find({ clerkUserId })
    .sort({ updatedAt: -1 })
    .limit(1)
    .toArray();
  if (latest[0]) {
    return latest[0];
  }

  return createCanvasProject(clerkUserId);
}

// Saves partial updates (title, nodes, edges, groups, viewport, thumbnailUrl) to an owned canvas.
export async function saveCanvasProject(
  clerkUserId: string,
  canvasId: string,
  patch: SaveCanvasProjectPatch,
): Promise<CanvasProject | null> {
  if (!ObjectId.isValid(canvasId)) {
    return null;
  }

  const projects = await canvasProjectsCollection();
  const canvasObjectId = new ObjectId(canvasId);
  const setFields: Partial<CanvasProject> = {
    updatedAt: new Date(),
  };

  if (patch.title !== undefined) {
    setFields.title = normalizeCanvasTitle(patch.title);
  }
  if (patch.nodes !== undefined) {
    // A tab opened before settings kinds still sends `explainerSettings`; convert it before the schema drops it.
    const parsedNodes = nodesArraySchema.parse(upgradeLegacySettingsNodes(patch.nodes as CanvasNode[]).nodes);
    // A flow wave can save the graph before the completed output is painted.
    // Keep the stored URL so the downstream node can still read it.
    const existing = await projects.findOne(
      { _id: canvasObjectId, clerkUserId },
      { projection: { nodes: 1 } },
    );
    setFields.nodes = existing
      ? mergeCanvasNodeSnapshots(existing.nodes, parsedNodes)
      : parsedNodes;
  }
  if (patch.edges !== undefined) {
    setFields.edges = edgesArraySchema.parse(patch.edges);
  }
  if (patch.groups !== undefined) {
    setFields.groups = groupsArraySchema.parse(patch.groups);
  }
  if (patch.viewport !== undefined) {
    setFields.viewport = canvasViewportSchema.parse(patch.viewport);
  }
  if (patch.thumbnailUrl !== undefined && patch.thumbnailUrl.trim()) {
    setFields.thumbnailUrl = patch.thumbnailUrl.trim();
  }

  return projects.findOneAndUpdate(
    { _id: canvasObjectId, clerkUserId },
    { $set: setFields },
    { returnDocument: "after" },
  );
}

// Deletes an owned canvas project. Execution audit records in `canvas_jobs` are preserved.
export async function deleteCanvasProject(
  clerkUserId: string,
  canvasId: string,
): Promise<{ deleted: boolean }> {
  if (!ObjectId.isValid(canvasId)) {
    return { deleted: false };
  }
  const projects = await canvasProjectsCollection();
  const result = await projects.deleteOne({
    _id: new ObjectId(canvasId),
    clerkUserId,
  });
  return { deleted: result.deletedCount === 1 };
}

function resolveCharacterPreviewUrl(character: Character): string | undefined {
  const versions = character.versions ?? [];
  const defaultVersion = character.defaultVersionId
    ? versions.find((v) => v.id.equals(character.defaultVersionId!))
    : undefined;

  const pickUrl = (v?: Character["versions"][number]) =>
    v?.profileUrl?.trim() || v?.blueprintUrl?.trim() || v?.portraitUrl?.trim();

  const defaultUrl = pickUrl(defaultVersion);
  if (defaultUrl) return defaultUrl;

  for (let i = versions.length - 1; i >= 0; i -= 1) {
    const version = versions[i];
    if (version?.status === "completed") {
      const url = pickUrl(version);
      if (url) return url;
    }
  }
  for (let i = versions.length - 1; i >= 0; i -= 1) {
    const url = pickUrl(versions[i]);
    if (url) return url;
  }
  return undefined;
}

// Aggregates the user's Scro Characters, Products, and recent completed Canvas outputs
// for drag-and-drop placement from the Assets drawer.
export async function listCanvasLibraryAssets(
  clerkUserId: string,
): Promise<CanvasLibraryAssetsResult> {
  const [charactersCol, productsCol, jobsCol, wardrobeItems] = await Promise.all([
    charactersCollection(),
    productsCollection(),
    canvasJobsCollection(),
    listCustomWardrobeItems(clerkUserId),
  ]);

  const [characterDocs, productDocs, recentJobs] = await Promise.all([
    charactersCol.find({ clerkUserId }).sort({ updatedAt: -1 }).limit(50).toArray(),
    productsCol.find({ clerkUserId }).sort({ updatedAt: -1 }).limit(50).toArray(),
    jobsCol
      .find({
        clerkUserId,
        status: "completed",
        outputUrl: { $exists: true, $ne: "" },
      })
      .sort({ updatedAt: -1 })
      .limit(30)
      .toArray(),
  ]);

  const characters: CanvasLibraryAsset[] = [];
  const outfits: CanvasLibraryAsset[] = [];
  const characterOptions: CanvasLibraryCharacterOption[] = [];
  for (const doc of characterDocs) {
    const character = doc as Character;
    if (!character._id) continue;
    const url = resolveCharacterPreviewUrl(character);
    const id = character._id.toHexString();
    const name = character.name || "Character";
    characterOptions.push({ id, name, ...(url ? { previewUrl: url } : {}) });
    if (url) {
      characters.push({
        id,
        source: "character",
        name,
        mediaKind: "image",
        url,
        thumbnailUrl: url,
        createdAt: (character.updatedAt ?? character.createdAt ?? new Date()).toISOString(),
      });
    }
    for (const preset of character.presets ?? []) {
      const version = character.versions.find((item) => item.id.equals(preset.versionId));
      const lookUrl = version?.portraitUrl || version?.profileUrl || version?.blueprintUrl;
      if (!version || version.status !== "completed" || !lookUrl) continue;
      outfits.push({
        id: `outfit-${id}-${preset.id.toHexString()}`,
        source: "outfit",
        name: `${name} · ${preset.name}`,
        mediaKind: "image",
        url: lookUrl,
        thumbnailUrl: lookUrl,
        createdAt: preset.createdAt.toISOString(),
        outfitPart: "look",
        outfitPrompt: version.editInstruction || preset.name,
        characterId: id,
      });
    }
  }

  for (const item of wardrobeItems) {
    const url = item.previewImageUrl || item.referenceImageUrl;
    if (!url) continue;
    outfits.push({
      id: `wardrobe-${item.id}`,
      source: "outfit",
      name: item.nameZh || item.name,
      mediaKind: "image",
      url,
      thumbnailUrl: url,
      createdAt: item.createdAt,
      outfitPart: item.part,
      outfitPrompt: item.prompt,
    });
  }

  const products: CanvasLibraryAsset[] = [];
  for (const doc of productDocs) {
    if (!doc._id) continue;
    const url = doc.blueprintUrl?.trim() || doc.referenceImageUrls?.[0]?.trim();
    if (!url) continue;
    products.push({
      id: doc._id.toHexString(),
      source: "product",
      name: doc.name || "Product",
      mediaKind: "image",
      url,
      thumbnailUrl: url,
      createdAt: (doc.updatedAt ?? doc.createdAt ?? new Date()).toISOString(),
    });
  }

  const recentOutputs: CanvasLibraryAsset[] = [];
  for (const job of recentJobs) {
    const url = job.outputUrl?.trim();
    if (!url) continue;
    const mediaKind =
      job.outputKind === "video"
        ? "video"
        : job.outputKind === "audio"
          ? "audio"
          : "image";
    recentOutputs.push({
      id: job._id.toHexString(),
      source: "canvas_output",
      name: job.providerModelId || job.modelId,
      mediaKind,
      url,
      ...(mediaKind === "image" ? { thumbnailUrl: url } : {}),
      createdAt: job.updatedAt.toISOString(),
    });
  }

  return { characters, outfits, products, recentOutputs, characterOptions };
}
