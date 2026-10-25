import { put } from "@vercel/blob";
import type { ObjectId } from "mongodb";
import sharp from "sharp";
import { poseEditsCollection } from "@/dao";
import type { PoseEdit } from "@/model/pose-edit";
import type { AppUser } from "@/model/user";
import { assertCanSpendCredits, consumeCredits } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { poseEditAspect, type PoseEditAspect } from "@/service/pose-edit/aspect";
import { toPoseEditDto, type PoseEditDto } from "@/service/pose-edit/dto";
import { POSE_EDIT_ERRORS } from "@/service/pose-edit/errors";
import {
  POSE_EDIT_MAX_BYTES,
  sniffPoseEditImage,
  type PoseEditImageType,
} from "@/service/pose-edit/image";
import { enqueuePoseEdit } from "@/service/pose-edit/send";
import { parsePoseEditSelection, type PoseEditWardrobe } from "@/service/pose-edit/selection";
import { failPoseEdit } from "@/service/pose-edit/sync";

const BLOB_NOT_CONFIGURED = "尚未設定 Vercel Blob";

// Upload refused before any bytes are stored. Other upload failures still throw.
class PoseEditUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PoseEditUploadError";
  }
}

export type PoseEditDraft = {
  clerkUserId: string;
  sourceUrl: string;
  poseId?: string;
  wardrobe: PoseEditWardrobe;
  aspect: PoseEditAspect;
  status: "pending";
  spendKey: string;
};

export type PoseEditCreateDeps = {
  assertCanSpend: (user: AppUser, cost: number) => Promise<unknown>;
  upload: (bytes: Uint8Array, contentType: PoseEditImageType, clerkUserId: string) => Promise<string>;
  consume: (clerkUserId: string, cost: number) => Promise<string>;
  insert: (draft: PoseEditDraft) => Promise<PoseEdit>;
  enqueue: (id: ObjectId) => Promise<unknown>;
  fail: (id: ObjectId, error: string) => Promise<void>;
  readSize: (bytes: Uint8Array) => Promise<{ width?: number; height?: number }>;
};

export type CreatePoseEditResult =
  | { ok: true; dto: PoseEditDto }
  | { ok: false; status: 400; error: string };

const SPEND_REFUSALS = new Set<string>([POSE_EDIT_ERRORS.subscribe, POSE_EDIT_ERRORS.credits]);

function spendRefusal(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  return SPEND_REFUSALS.has(error.message) ? error.message : undefined;
}

async function readPoseEditSize(bytes: Uint8Array) {
  const { width, height } = await sharp(Buffer.from(bytes)).metadata();
  return { width, height };
}

async function uploadPoseEditSource(
  bytes: Uint8Array,
  contentType: PoseEditImageType,
  clerkUserId: string,
) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new PoseEditUploadError(BLOB_NOT_CONFIGURED);
  const blob = await put(`explainer/pose-edits/${clerkUserId}/${Date.now()}-source`, Buffer.from(bytes), {
    access: "public",
    contentType,
  });
  return blob.url;
}

async function insertPoseEdit(draft: PoseEditDraft): Promise<PoseEdit> {
  const edits = await poseEditsCollection();
  const now = new Date();
  const doc = { ...draft, createdAt: now, updatedAt: now };
  const inserted = await edits.insertOne(doc);
  return { ...doc, _id: inserted.insertedId };
}

const defaultDeps: PoseEditCreateDeps = {
  assertCanSpend: assertCanSpendCredits,
  upload: uploadPoseEditSource,
  consume: consumeCredits,
  insert: insertPoseEdit,
  enqueue: enqueuePoseEdit,
  fail: failPoseEdit,
  readSize: readPoseEditSize,
};

// Validate, charge, store the photo, then queue. Enqueue failure is marked failed
// once; failPoseEdit refunds, so this function does not call refundCredits.
export async function createPoseEdit(input: {
  user: AppUser;
  bytes: Uint8Array;
  fields: {
    poseId?: string;
    top?: string;
    pants?: string;
    shoes?: string;
    accessory?: string;
  };
  deps?: Partial<PoseEditCreateDeps>;
}): Promise<CreatePoseEditResult> {
  const deps: PoseEditCreateDeps = { ...defaultDeps, ...input.deps };
  const selection = parsePoseEditSelection(input.fields);
  if (!selection.ok) return { ok: false, status: 400, error: selection.error };

  if (input.bytes.byteLength === 0 || input.bytes.byteLength > POSE_EDIT_MAX_BYTES) {
    return { ok: false, status: 400, error: POSE_EDIT_ERRORS.file };
  }
  const contentType = sniffPoseEditImage(input.bytes);
  if (!contentType) return { ok: false, status: 400, error: POSE_EDIT_ERRORS.file };

  const size = await deps.readSize(input.bytes);
  const aspect = poseEditAspect(size.width, size.height);

  try {
    await deps.assertCanSpend(input.user, FRAME_COST);
  } catch (error) {
    const refusal = spendRefusal(error);
    if (refusal) return { ok: false, status: 400, error: refusal };
    throw error;
  }

  let sourceUrl: string;
  try {
    sourceUrl = await deps.upload(input.bytes, contentType, input.user.clerkUserId);
  } catch (error) {
    if (error instanceof PoseEditUploadError) return { ok: false, status: 400, error: error.message };
    throw error;
  }

  const spendKey = await deps.consume(input.user.clerkUserId, FRAME_COST);
  const poseId = "poseId" in selection ? selection.poseId : undefined;
  const edit = await deps.insert({
    clerkUserId: input.user.clerkUserId,
    sourceUrl,
    ...(poseId ? { poseId } : {}),
    wardrobe: selection.wardrobe,
    aspect,
    status: "pending",
    spendKey,
  });

  try {
    await deps.enqueue(edit._id);
  } catch {
    await deps.fail(edit._id, POSE_EDIT_ERRORS.failed);
    return {
      ok: true,
      dto: toPoseEditDto({ ...edit, status: "failed", error: POSE_EDIT_ERRORS.failed }),
    };
  }

  return { ok: true, dto: toPoseEditDto(edit) };
}
