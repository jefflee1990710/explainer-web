import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { ObjectId } from "mongodb";
import { charactersCollection, postsCollection, productsCollection } from "@/dao";
import { characterStyleIds, resolveVersionForStyle } from "@/service/character/character-styles";
import type { Character } from "@/model/character";
import type { Product, ProductShot } from "@/model/product";
import { isListedStyleId } from "@/service/style/list-selectable";
import type { PosterLayout } from "@/model/post";
import { isPosterLayoutId, type Post, type PublicPost } from "@/model/post";
import { requireAppUser } from "@/service/auth";
import { assertCanSpendCredits, consumeCredits, refundCredits } from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { insertPendingJob, kickJob } from "@/service/generation/task-store";
import { applyPosterCopy, posterCopyText, validatePostInstruction } from "@/service/post/copy";
import { designPosterCopy } from "@/service/post/designer";
import { posterLayout } from "@/service/post/layouts";
import { getAppUrl, isPublicHttpUrl } from "@/util/app-url";

export type PostActionError =
  | "instruction_required"
  | "instruction_too_long"
  | "layout_invalid"
  | "subscription"
  | "credits"
  | "designer"
  | "preview"
  | "not_found"
  | "busy"
  | "save"
  | "cast"
  | "product";

const blueprintUrls = new Map<string, string>();

async function buildPostCast(clerkUserId: string, styleId: string, characterIds: string[]) {
  if (characterIds.length === 0) return { ok: true as const, cast: [] as NonNullable<Post["cast"]> };
  if (!isListedStyleId(styleId)) return { ok: false as const, error: "cast" as const };
  const characters = await charactersCollection();
  const docs = (await characters
    .find({ _id: { $in: characterIds.map((id) => new ObjectId(id)) }, clerkUserId })
    .toArray()) as Character[];
  if (docs.length !== characterIds.length) return { ok: false as const, error: "cast" as const };
  const cast: NonNullable<Post["cast"]> = [];
  for (const id of characterIds) {
    const character = docs.find((doc) => doc._id.toHexString() === id);
    if (!character || !characterStyleIds(character).includes(styleId)) {
      return { ok: false as const, error: "cast" as const };
    }
    const version = resolveVersionForStyle(character, styleId);
    if (!version?.blueprintUrl) return { ok: false as const, error: "cast" as const };
    cast.push({ characterId: character._id, name: character.name, blueprintUrl: version.blueprintUrl });
  }
  return { ok: true as const, cast };
}

async function buildPostProducts(clerkUserId: string, productIds: string[]) {
  if (productIds.length === 0) return { ok: true as const, products: [] as ProductShot[] };
  const products = await productsCollection();
  const docs = (await products
    .find({ _id: { $in: productIds.map((id) => new ObjectId(id)) }, clerkUserId })
    .toArray()) as Product[];
  if (docs.length !== productIds.length) return { ok: false as const, error: "product" as const };
  const shots: ProductShot[] = [];
  for (const id of productIds) {
    const product = docs.find((doc) => doc._id.toHexString() === id);
    if (!product?.blueprintUrl || product.status !== "completed") {
      return { ok: false as const, error: "product" as const };
    }
    shots.push({ productId: product._id, name: product.name, blueprintUrl: product.blueprintUrl });
  }
  return { ok: true as const, products: shots };
}

function spendError(error: unknown): PostActionError {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("訂閱")) return "subscription";
  if (message.includes("credits")) return "credits";
  return "preview";
}

// Public app URL, or a one-time blob upload when the app is not reachable.
export async function blueprintReferenceUrl(layout: PosterLayout) {
  const cached = blueprintUrls.get(layout.id);
  if (cached) return cached;
  const local = `${getAppUrl()}${layout.blueprintPath}`;
  if (isPublicHttpUrl(local)) {
    blueprintUrls.set(layout.id, local);
    return local;
  }
  const file = await readFile(path.join(process.cwd(), "public", layout.blueprintPath));
  const blob = await put(`explainer/posters/blueprints/${layout.id}.png`, file, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  blueprintUrls.set(layout.id, blob.url);
  return blob.url;
}

export function toPublicPost(post: Post): PublicPost {
  return {
    id: post._id.toHexString(),
    layoutId: post.layoutId,
    instruction: post.instruction,
    layers: post.layers,
    previewUrl: post.previewUrl,
    thumbnailUrl: post.thumbnailUrl,
    previewStatus: post.previewStatus,
  };
}

export function postHeadline(post: { layers?: { type: string; text?: string }[] }) {
  const text = post.layers?.find((layer) => layer.type === "text" && layer.text?.trim());
  return text?.text?.trim() || "";
}

async function queuePreview(postId: ObjectId, clerkUserId: string) {
  const posts = await postsCollection();
  let spendKey: string | undefined;
  try {
    spendKey = await consumeCredits(clerkUserId, FRAME_COST);
    const jobId = await insertPendingJob({
      kind: "postPreview",
      postId,
      clipIndex: 0,
      model: "",
    });
    await posts.updateOne(
      { _id: postId, clerkUserId },
      {
        $set: {
          previewStatus: "generating",
          previewJobId: jobId,
          previewSpendKey: spendKey,
          updatedAt: new Date(),
        },
      },
    );
    kickJob(jobId);
    return { ok: true as const };
  } catch (error) {
    if (spendKey) await refundCredits(clerkUserId, FRAME_COST, spendKey);
    await posts.updateOne(
      { _id: postId, clerkUserId },
      { $set: { previewStatus: "failed", updatedAt: new Date() }, $unset: { previewSpendKey: "" } },
    );
    return { ok: false as const, error: spendError(error) };
  }
}

// Fill the layout, store the poster, then queue the scene-image preview.
export async function createPost(input: {
  layoutId: string;
  instruction: string;
  styleId?: string;
  characterIds?: string[];
  productIds?: string[];
}) {
  const instruction = validatePostInstruction(input.instruction);
  if (!instruction.ok) return instruction;
  if (!isPosterLayoutId(input.layoutId)) {
    return { ok: false as const, error: "layout_invalid" as const };
  }
  const user = await requireAppUser();
  try {
    await assertCanSpendCredits(user, FRAME_COST);
  } catch (error) {
    return { ok: false as const, error: spendError(error) };
  }

  const styleId = (input.styleId || "").trim();
  const characterIds = (input.characterIds ?? []).filter((id) => ObjectId.isValid(id)).slice(0, 4);
  const productIds = (input.productIds ?? []).filter((id) => ObjectId.isValid(id)).slice(0, 2);
  const castResult = await buildPostCast(user.clerkUserId, styleId, characterIds);
  if (!castResult.ok) return castResult;
  const productResult = await buildPostProducts(user.clerkUserId, productIds);
  if (!productResult.ok) return productResult;

  const layout = posterLayout(input.layoutId);
  let raw: Record<string, string>;
  try {
    raw = await designPosterCopy(layout, instruction.instruction);
  } catch {
    return { ok: false as const, error: "designer" as const };
  }

  const now = new Date();
  const posts = await postsCollection();
  const { insertedId } = await posts.insertOne({
    clerkUserId: user.clerkUserId,
    layoutId: layout.id,
    instruction: instruction.instruction,
    layers: applyPosterCopy(layout, raw),
    ...(styleId ? { styleId } : {}),
    ...(castResult.cast.length ? { cast: castResult.cast } : {}),
    ...(productResult.products.length ? { products: productResult.products } : {}),
    previewStatus: "generating",
    aspectRatio: "2:3",
    createdAt: now,
    updatedAt: now,
  });

  await queuePreview(insertedId, user.clerkUserId);
  return { ok: true as const, id: insertedId.toHexString() };
}

// Charge again and replace a failed preview. Layers stay as they are.
export async function retryPostPreview(postId: string) {
  if (!ObjectId.isValid(postId)) return { ok: false as const, error: "not_found" as const };
  const user = await requireAppUser();
  const posts = await postsCollection();
  const post = await posts.findOne({ _id: new ObjectId(postId), clerkUserId: user.clerkUserId });
  if (!post) return { ok: false as const, error: "not_found" as const };
  if (post.previewStatus === "generating") return { ok: false as const, error: "busy" as const };
  if (!posterCopyText(post.layers) && post.previewStatus === "ready") {
    return { ok: true as const, id: post._id.toHexString() };
  }
  try {
    await assertCanSpendCredits(user, FRAME_COST);
  } catch (error) {
    return { ok: false as const, error: spendError(error) };
  }
  await queuePreview(post._id, user.clerkUserId);
  return { ok: true as const, id: post._id.toHexString() };
}

export async function listOwnedPosts(clerkUserId: string) {
  const posts = await postsCollection();
  return posts.find({ clerkUserId }).sort({ updatedAt: -1 }).limit(120).toArray();
}

export async function loadOwnedPost(postId: string, clerkUserId: string) {
  if (!ObjectId.isValid(postId)) return null;
  const posts = await postsCollection();
  return posts.findOne({ _id: new ObjectId(postId), clerkUserId });
}
