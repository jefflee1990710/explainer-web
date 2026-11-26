// Multi-project MongoDB CRUD and Scro library asset aggregation
// for the Interactive Node Canvas Editor (/app/canvas).

import { ObjectId } from "mongodb";
import { z } from "zod";
import {
  canvasFoldersCollection,
  canvasJobsCollection,
  canvasProjectsCollection,
  charactersCollection,
  productsCollection,
} from "@/dao";
import {
  type CanvasNode,
  type CanvasProject,
  type CanvasViewport,
  canvasEdgeSchema,
  canvasGroupSchema,
  canvasNodeSchema,
  canvasViewportSchema,
} from "@/model/canvas";
import type {
  CanvasFlowRunDto,
  CanvasJobDto,
  CanvasLibraryAsset,
  CanvasLibraryAssetsResult,
  CanvasLibraryCharacterOption,
  CanvasProjectDto,
  CanvasProjectSummaryDto,
  CreateCanvasProjectInput,
  SaveCanvasProjectPatch,
} from "@/model/canvas-dto";
import type { Character } from "@/model/character";
import { listCustomWardrobeItems } from "@/service/character/custom-wardrobe";
import { mergeCanvasNodeSnapshots, restoreBusyNodesFromCompletedJobs } from "@/service/canvas/graph";
import { liftLegacyExplainerSettings } from "@/service/canvas/director-migrate";

export type {
  CanvasFlowRunDto,
  CanvasJobDto,
  CanvasLibraryAsset,
  CanvasLibraryAssetsResult,
  CanvasLibraryCharacterOption,
  CanvasProjectDto,
  CanvasProjectSummaryDto,
  CreateCanvasProjectInput,
  SaveCanvasProjectPatch,
};

export const DEFAULT_CANVAS_TITLE = "Untitled Canvas";
export const CANVAS_TITLE_MAX_LENGTH = 120;
export const DEFAULT_CANVAS_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };

const nodesArraySchema = z.array(canvasNodeSchema);
const edgesArraySchema = z.array(canvasEdgeSchema);
const groupsArraySchema = z.array(canvasGroupSchema).max(200);

function normalizeCanvasTitle(raw?: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return DEFAULT_CANVAS_TITLE;
  return trimmed.slice(0, CANVAS_TITLE_MAX_LENGTH);
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

  let folderId: ObjectId | undefined;
  if (input?.folderId && ObjectId.isValid(input.folderId)) {
    const owned = await (await canvasFoldersCollection()).findOne({
      _id: new ObjectId(input.folderId),
      clerkUserId,
    });
    if (owned) folderId = owned._id;
  }

  const doc: CanvasProject = {
    _id: new ObjectId(),
    clerkUserId,
    title: normalizeCanvasTitle(input?.title),
    ...(input?.thumbnailUrl?.trim()
      ? { thumbnailUrl: input.thumbnailUrl.trim() }
      : {}),
    ...(folderId ? { folderId } : {}),
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
// A stale canvas snapshot can save a finished job back to Running, or put the previous
// file on a node whose job already finished. Use that job's file.
export async function healFinishedCanvasRuns(
  clerkUserId: string,
  canvasId: ObjectId,
  nodes: CanvasNode[],
): Promise<CanvasNode[]> {
  const jobIds = nodes.flatMap((node) => {
    const jobId = node.data.lastJobId;
    return node.type === "model" && jobId && ObjectId.isValid(jobId) ? [new ObjectId(jobId)] : [];
  });
  if (jobIds.length === 0) return nodes;

  const jobsCol = await canvasJobsCollection();
  const jobs = await jobsCol
    .find({ _id: { $in: jobIds }, clerkUserId, status: "completed" })
    .toArray();
  const healed = restoreBusyNodesFromCompletedJobs(
    nodes,
    jobs.map((job) => ({
      id: job._id.toHexString(),
      nodeId: job.nodeId,
      outputUrl: job.outputUrl,
      outputKind: job.outputKind,
      chargedUsd: job.chargedUsd,
    })),
  );
  if (healed.restoredIds.length === 0) return nodes;

  const projects = await canvasProjectsCollection();
  const now = new Date();
  let result = nodes;
  for (const nodeId of healed.restoredIds) {
    const node = healed.nodes.find((item) => item.id === nodeId);
    if (!node?.data.outputUrl || !node.data.lastJobId) continue;
    const updated = await projects.updateOne(
      {
        _id: canvasId,
        clerkUserId,
        nodes: {
          $elemMatch: {
            id: nodeId,
            "data.lastJobId": node.data.lastJobId,
            $or: [
              { "data.status": { $in: ["queued", "running"] } },
              { "data.outputUrl": { $ne: node.data.outputUrl } },
            ],
          },
        },
      },
      {
        $set: {
          "nodes.$.data.status": "completed",
          "nodes.$.data.outputUrl": node.data.outputUrl,
          ...(node.data.outputKind ? { "nodes.$.data.outputKind": node.data.outputKind } : {}),
          ...(node.data.lastCostUsd !== undefined ? { "nodes.$.data.lastCostUsd": node.data.lastCostUsd } : {}),
          updatedAt: now,
        },
        $unset: {
          "nodes.$.data.lastError": "",
          ...(node.data.staleOutputUrl ? {} : { "nodes.$.data.staleOutputUrl": "" }),
        },
      },
    );
    if (updated.modifiedCount > 0) {
      result = result.map((item) => (item.id === nodeId ? node : item));
    }
  }
  return result;
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

  if (patch.nodes === undefined) {
    const saved = await projects.findOneAndUpdate(
      { _id: canvasObjectId, clerkUserId },
      { $set: setFields },
      { returnDocument: "after" },
    );
    if (!saved) return null;
    const nodes = await healFinishedCanvasRuns(clerkUserId, canvasObjectId, saved.nodes);
    return nodes === saved.nodes ? saved : { ...saved, nodes };
  }

  // A tab opened before settings kinds still sends `explainerSettings`; convert it before the schema drops it.
  const parsedNodes = nodesArraySchema.parse(liftLegacyExplainerSettings(patch.nodes as CanvasNode[]));

  // Optimistic CAS on `updatedAt` so a concurrent worker write (new `lastJobId` / `status` / `outputUrl`)
  // between `findOne` and `findOneAndUpdate` is re-merged instead of overwritten.
  let saved: CanvasProject | null = null;
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const existing = await projects.findOne(
      { _id: canvasObjectId, clerkUserId },
      { projection: { nodes: 1, updatedAt: 1 } },
    );
    if (!existing) return null;

    const mergedNodes = mergeCanvasNodeSnapshots(existing.nodes, parsedNodes);
    const attemptSet: Partial<CanvasProject> = {
      ...setFields,
      nodes: mergedNodes,
      updatedAt: new Date(),
    };
    const isLastAttempt = attempt === maxAttempts - 1;
    const filter = isLastAttempt
      ? { _id: canvasObjectId, clerkUserId }
      : { _id: canvasObjectId, clerkUserId, updatedAt: existing.updatedAt };

    saved = await projects.findOneAndUpdate(
      filter,
      { $set: attemptSet },
      { returnDocument: "after" },
    );
    if (saved) break;
  }

  if (!saved) return null;
  const nodes = await healFinishedCanvasRuns(clerkUserId, canvasObjectId, saved.nodes);
  return nodes === saved.nodes ? saved : { ...saved, nodes };
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

export type CharacterLibraryImages = {
  previewUrl?: string;
  portraitUrl?: string;
  fullBodyUrl?: string;
};

function versionLibraryImages(version?: {
  portraitUrl?: string;
  profileUrl?: string;
  blueprintUrl?: string;
}): CharacterLibraryImages | undefined {
  const portraitUrl = version?.portraitUrl?.trim() || undefined;
  const fullBodyUrl = version?.profileUrl?.trim() || undefined;
  const blueprintUrl = version?.blueprintUrl?.trim() || undefined;
  const previewUrl = fullBodyUrl || blueprintUrl || portraitUrl;
  if (!previewUrl) return undefined;
  return {
    previewUrl,
    ...(portraitUrl ? { portraitUrl } : {}),
    ...(fullBodyUrl ? { fullBodyUrl } : {}),
  };
}

// Face and full-body stills from the same version. Prefer a version that has both.
export function characterLibraryImages(character: Pick<Character, "versions" | "defaultVersionId">): CharacterLibraryImages | undefined {
  const versions = character.versions ?? [];
  const ordered: Character["versions"] = [];
  const seen = new Set<string>();
  const push = (version?: Character["versions"][number]) => {
    if (!version) return;
    const key = version.id.toHexString();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(version);
  };
  if (character.defaultVersionId) {
    push(versions.find((version) => version.id.equals(character.defaultVersionId!)));
  }
  for (let i = versions.length - 1; i >= 0; i -= 1) {
    if (versions[i]?.status === "completed") push(versions[i]);
  }
  for (let i = versions.length - 1; i >= 0; i -= 1) push(versions[i]);

  const images = ordered.map(versionLibraryImages);
  return images.find((item) => item?.portraitUrl && item.fullBodyUrl) ?? images.find(Boolean);
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
    const images = characterLibraryImages(character);
    const id = character._id.toHexString();
    const name = character.name || "Character";
    characterOptions.push({
      id,
      name,
      ...(images?.previewUrl ? { previewUrl: images.previewUrl } : {}),
      ...(images?.portraitUrl ? { portraitUrl: images.portraitUrl } : {}),
      ...(images?.fullBodyUrl ? { fullBodyUrl: images.fullBodyUrl } : {}),
    });
    const url = images?.previewUrl;
    if (url) {
      characters.push({
        id,
        source: "character",
        name,
        mediaKind: "image",
        url,
        thumbnailUrl: url,
        ...(images?.portraitUrl ? { portraitUrl: images.portraitUrl } : {}),
        ...(images?.fullBodyUrl ? { fullBodyUrl: images.fullBodyUrl } : {}),
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
    if (!url || job.outputKind === "text") continue;
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
