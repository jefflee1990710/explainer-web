import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import sharp from "sharp";
import { charactersCollection, postsCollection, productsCollection } from "@/dao";
import type { Character } from "@/model/character";
import {
  isPostAspectRatio,
  POST_PROMPT_MAX,
  toPublicPost,
  type DetectedPostElement,
  type Post,
  type PostAspectRatio,
  type PostCastMember,
  type PostElementEditMode,
  type PostProductItem,
  type PostRevision,
  type PublicPost,
} from "@/model/post";
import type { Product } from "@/model/product";
import { requireAppUser } from "@/service/auth";
import {
  assertCanSpendCredits,
  consumeCredits,
  refundCredits,
} from "@/service/billing/credits";
import { FRAME_COST } from "@/service/credit-costs";
import { detectPostElementsWithFalSam3 } from "@/service/fal/sam3-post";
import { persistBuffer } from "@/service/higgsfield/persist";
import { upsampleJutsuFramePrompt } from "@/service/jutsu/describer";
import { resolveCharacterDonorForSwap } from "@/service/jutsu/pipeline";
import {
  OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
  submitOpenRouterImage,
} from "@/service/openrouter/generate";
import {
  buildPostCreatePrompt,
  buildPostElementEditPrompt,
} from "@/service/post/prompts";
import { loadRenderableStyle } from "@/service/style/renderable-style";

export type CreatePostJobInput = {
  prompt: string;
  aspectRatio?: PostAspectRatio;
  styleId?: string;
  characterIds?: string[];
  characterLookUrls?: Record<string, string>;
  productIds?: string[];
  referenceImageUrl?: string;
  sourceImageUrl?: string;
};

export function pickCharacterLookUrl(
  characterId: string,
  characterLookUrls?: Record<string, string>,
): string | undefined {
  const url = characterLookUrls?.[characterId]?.trim();
  return url ? url : undefined;
}

export type EditPostElementInput = {
  postId: string;
  elementId: string;
  editMode: PostElementEditMode;
  instruction?: string;
  characterId?: string;
  characterLookUrl?: string;
  productId?: string;
  referenceImageUrl?: string;
};

export function validateEditPostElementInput(input: {
  element: DetectedPostElement;
  editMode: PostElementEditMode;
  instruction?: string;
  characterId?: string;
  characterLookUrl?: string;
  productId?: string;
  referenceImageUrl?: string;
}): { ok: true } | { ok: false; error: string } {
  const { element, editMode } = input;
  if (editMode === "remove") {
    return { ok: true };
  }
  if (editMode === "swap_character") {
    const hasChar = Boolean(
      input.characterId?.trim() ||
        input.characterLookUrl?.trim() ||
        input.referenceImageUrl?.trim(),
    );
    if (!hasChar) {
      return { ok: false, error: "請選擇要替換的 Scro 角色或上傳角色參考圖" };
    }
    return { ok: true };
  }
  if (editMode === "replace_product") {
    const hasProd = Boolean(
      input.productId?.trim() ||
        input.referenceImageUrl?.trim() ||
        input.instruction?.trim(),
    );
    if (!hasProd) {
      return { ok: false, error: "請選擇產品、上傳物件圖或輸入替換描述" };
    }
    return { ok: true };
  }
  if (element.category === "text" && !(input.instruction || "").trim()) {
    return { ok: false, error: "請輸入要替換的新文字內容" };
  }
  if (!(input.instruction || "").trim() && !input.referenceImageUrl?.trim()) {
    return { ok: false, error: "請輸入修改指令或上傳參考圖" };
  }
  return { ok: true };
}

export function applyRevisionSelection(
  revisions: readonly PostRevision[],
  revisionId: string,
): {
  currentImageUrl: string;
  detectedElements: DetectedPostElement[];
} | null {
  const target = revisions.find((r) => r.revisionId === revisionId);
  if (!target || !target.imageUrl) return null;
  return {
    currentImageUrl: target.imageUrl,
    detectedElements: target.detectedElements ?? [],
  };
}

async function generateSeedreamPostBuffer(input: {
  prompt: string;
  aspectRatio: PostAspectRatio;
  referenceImageUrls: string[];
}): Promise<Buffer> {
  const res = await submitOpenRouterImage({
    model: OPENROUTER_SEEDREAM_5_PRO_IMAGE_MODEL,
    prompt: input.prompt,
    aspectRatio: input.aspectRatio,
    resolution: "2k",
    referenceImageUrls: input.referenceImageUrls,
  });
  const url = res.images?.[0]?.url;
  if (!url) {
    throw new Error("OpenRouter Seedream 5.0 Pro 未回傳圖片");
  }
  const raw = url.startsWith("data:")
    ? Buffer.from(url.split(",")[1] || "", "base64")
    : Buffer.from(await (await fetch(url)).arrayBuffer());
  return sharp(raw).webp({ quality: 90 }).toBuffer();
}

async function segmentPostBuffer(imageBuffer: Buffer): Promise<DetectedPostElement[]> {
  try {
    const scaled = await sharp(imageBuffer)
      .resize(768, 768, { fit: "inside" })
      .jpeg({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    const width = scaled.info.width || 0;
    const height = scaled.info.height || 0;
    if (!width || !height) return [];
    return await detectPostElementsWithFalSam3({
      imageBuffer: scaled.data,
      width,
      height,
    });
  } catch {
    return [];
  }
}

async function resolveCastMembers(
  clerkUserId: string,
  characterIds: readonly string[],
  characterLookUrls?: Record<string, string>,
): Promise<PostCastMember[]> {
  const validIds = characterIds
    .map((id) => id.trim())
    .filter((id) => ObjectId.isValid(id))
    .slice(0, 4);
  if (validIds.length === 0) return [];
  const col = await charactersCollection();
  const docs = (await col
    .find({ _id: { $in: validIds.map((id) => new ObjectId(id)) }, clerkUserId })
    .toArray()) as Character[];

  const out: PostCastMember[] = [];
  for (const id of validIds) {
    const doc = docs.find((d) => d._id.toHexString() === id);
    if (!doc) continue;
    const requestedLook = pickCharacterLookUrl(id, characterLookUrls);
    const resolved = resolveCharacterDonorForSwap(doc, requestedLook);
    if (!resolved.donorImageUrl) continue;
    out.push({
      characterId: doc._id,
      name: resolved.characterName,
      lookUrl: resolved.donorImageUrl,
      ...(resolved.characterOutfitSpec ? { outfitSpec: resolved.characterOutfitSpec } : {}),
    });
  }
  return out;
}

async function resolveProductItems(
  clerkUserId: string,
  productIds: readonly string[],
): Promise<PostProductItem[]> {
  const validIds = productIds
    .map((id) => id.trim())
    .filter((id) => ObjectId.isValid(id))
    .slice(0, 2);
  if (validIds.length === 0) return [];
  const col = await productsCollection();
  const docs = (await col
    .find({ _id: { $in: validIds.map((id) => new ObjectId(id)) }, clerkUserId })
    .toArray()) as Product[];

  const out: PostProductItem[] = [];
  for (const id of validIds) {
    const doc = docs.find((d) => d._id.toHexString() === id);
    if (!doc?.blueprintUrl) continue;
    out.push({
      productId: doc._id,
      name: doc.name,
      blueprintUrl: doc.blueprintUrl,
    });
  }
  return out;
}

async function downloadBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function createPostJob(
  input: CreatePostJobInput,
): Promise<{ ok: true; post: PublicPost } | { ok: false; error: string }> {
  let spendKey: string | undefined;
  let clerkUserId = "";
  try {
    const user = await requireAppUser();
    clerkUserId = user.clerkUserId;
    const promptText = (input.prompt || "").trim();
    const sourceImageUrl = (input.sourceImageUrl || "").trim();

    if (!promptText && !sourceImageUrl) {
      return { ok: false, error: "請輸入貼文主題描述或上傳圖片" };
    }
    if (promptText.length > POST_PROMPT_MAX) {
      return { ok: false, error: `描述不可超過 ${POST_PROMPT_MAX} 字` };
    }

    const aspectRatio: PostAspectRatio =
      input.aspectRatio && isPostAspectRatio(input.aspectRatio)
        ? input.aspectRatio
        : "9:16";

    const postId = new ObjectId();
    const prefix = `explainer/posts/${user._id.toHexString()}/${postId.toHexString()}`;
    const posts = await postsCollection();

    // Direct upload mode (no AI generation needed when sourceImageUrl is uploaded without prompt)
    if (sourceImageUrl && !promptText) {
      const srcBuf = await downloadBuffer(sourceImageUrl);
      if (!srcBuf) {
        return { ok: false, error: "無法讀取上傳的圖片檔案" };
      }
      const meta = await sharp(srcBuf).metadata();
      const w = meta.width || 1080;
      const h = meta.height || 1920;
      const inferredRatio: PostAspectRatio =
        Math.abs(w - h) < Math.min(w, h) * 0.15
          ? "1:1"
          : w > h
            ? "16:9"
            : Math.abs(w / h - 2 / 3) < 0.08
              ? "2:3"
              : "9:16";

      const webpBuf = await sharp(srcBuf).webp({ quality: 90 }).toBuffer();
      const [imageUrl, detectedElements] = await Promise.all([
        persistBuffer(webpBuf, `${prefix}/rev-1-${Date.now()}.webp`, "image/webp"),
        segmentPostBuffer(webpBuf),
      ]);

      const now = new Date();
      const rev1: PostRevision = {
        revisionId: "rev-1",
        imageUrl,
        prompt: "Uploaded Post Image",
        editSummary: "上傳原始貼文",
        detectedElements,
        createdAt: now.toISOString(),
      };
      const doc: Post = {
        _id: postId,
        userId: user._id,
        clerkUserId: user.clerkUserId,
        status: "completed",
        prompt: "Uploaded Post Image",
        aspectRatio: inferredRatio,
        currentImageUrl: imageUrl,
        detectedElements,
        revisions: [rev1],
        createdAt: now,
        updatedAt: now,
      };
      await posts.insertOne(doc);
      try {
        revalidatePath("/app/posts");
      } catch {
        // Non-request context
      }
      return { ok: true, post: toPublicPost(doc) };
    }

    await assertCanSpendCredits(user, FRAME_COST);
    const [cast, products] = await Promise.all([
      resolveCastMembers(
        user.clerkUserId,
        input.characterIds ?? [],
        input.characterLookUrls,
      ),
      resolveProductItems(user.clerkUserId, input.productIds ?? []),
    ]);

    let styleName = "";
    let styleLook = "";
    const styleId = (input.styleId || "").trim();
    if (styleId) {
      try {
        const style = await loadRenderableStyle({
          styleId,
          ownerClerkUserId: user.clerkUserId,
        });
        styleName = style.name;
        styleLook = style.look;
      } catch {
        styleName = "";
      }
    }

    const referenceImageUrl = (input.referenceImageUrl || sourceImageUrl || "").trim() || undefined;
    const referenceUrls = [
      ...cast.map((c) => c.lookUrl),
      ...products.map((p) => p.blueprintUrl),
      ...(referenceImageUrl ? [referenceImageUrl] : []),
    ];

    const basePrompt = buildPostCreatePrompt({
      prompt: promptText,
      styleName,
      styleLook,
      cast,
      products,
      hasReferenceImage: Boolean(referenceImageUrl),
    });

    spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);

    const now = new Date();
    const doc: Post = {
      _id: postId,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      status: "rendering",
      prompt: promptText,
      aspectRatio,
      ...(styleId ? { styleId } : {}),
      ...(cast.length > 0 ? { cast } : {}),
      ...(products.length > 0 ? { products } : {}),
      ...(referenceImageUrl ? { referenceImageUrl } : {}),
      currentImageUrl: "",
      detectedElements: [],
      revisions: [],
      createdAt: now,
      updatedAt: now,
    };

    await posts.insertOne(doc);

    const bgInput = {
      postId,
      clerkUserId: user.clerkUserId,
      prefix,
      promptText,
      basePrompt,
      aspectRatio,
      referenceUrls,
      spendKey,
    };

    try {
      after(() => {
        void runPostCreateInBackground(bgInput);
      });
    } catch {
      void runPostCreateInBackground(bgInput);
    }

    try {
      revalidatePath("/app/posts");
    } catch {
      // Non-request context
    }
    return { ok: true, post: toPublicPost(doc) };
  } catch (error) {
    if (spendKey && clerkUserId) {
      await refundCredits(clerkUserId, FRAME_COST, spendKey).catch(() => {});
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "生成貼文失敗，請稍後再試",
    };
  }
}

export async function runPostCreateInBackground(input: {
  postId: ObjectId;
  clerkUserId: string;
  prefix: string;
  promptText: string;
  basePrompt: string;
  aspectRatio: PostAspectRatio;
  referenceUrls: string[];
  spendKey: string;
}): Promise<void> {
  const posts = await postsCollection();
  try {
    let finalPrompt = input.basePrompt;
    if (input.referenceUrls.length > 0) {
      const refBuffers = (
        await Promise.all(input.referenceUrls.map((u) => downloadBuffer(u)))
      ).filter((b): b is Buffer => Boolean(b));
      if (refBuffers.length > 0) {
        finalPrompt = await upsampleJutsuFramePrompt({
          baseRequest: input.basePrompt,
          imageBuffers: refBuffers,
        });
      }
    }

    const webpBuf = await generateSeedreamPostBuffer({
      prompt: finalPrompt,
      aspectRatio: input.aspectRatio,
      referenceImageUrls: input.referenceUrls,
    });

    const [imageUrl, detectedElements] = await Promise.all([
      persistBuffer(webpBuf, `${input.prefix}/rev-1-${Date.now()}.webp`, "image/webp"),
      segmentPostBuffer(webpBuf),
    ]);

    const now = new Date();
    const rev1: PostRevision = {
      revisionId: "rev-1",
      imageUrl,
      prompt: input.promptText,
      editSummary: "初始生成",
      detectedElements,
      createdAt: now.toISOString(),
    };

    await posts.updateOne(
      { _id: input.postId },
      {
        $set: {
          status: "completed",
          currentImageUrl: imageUrl,
          detectedElements,
          revisions: [rev1],
          updatedAt: now,
        },
      },
    );
  } catch (error) {
    console.error("[post] background generation failed", {
      postId: input.postId.toHexString(),
      error,
    });
    if (input.spendKey && input.clerkUserId) {
      await refundCredits(input.clerkUserId, FRAME_COST, input.spendKey).catch(() => {});
    }
    await posts.updateOne(
      { _id: input.postId },
      {
        $set: {
          status: "failed",
          updatedAt: new Date(),
        },
      },
    );
  }
}

export async function editPostElementJob(
  input: EditPostElementInput,
): Promise<{ ok: true; post: PublicPost } | { ok: false; error: string }> {
  let spendKey: string | undefined;
  let clerkUserId = "";
  try {
    const user = await requireAppUser();
    clerkUserId = user.clerkUserId;
    if (!ObjectId.isValid(input.postId)) {
      return { ok: false, error: "找不到貼文" };
    }
    const posts = await postsCollection();
    const rawDoc = await posts.findOne({
      _id: new ObjectId(input.postId),
      clerkUserId: user.clerkUserId,
    });
    if (!rawDoc) {
      return { ok: false, error: "找不到貼文" };
    }
    const pub = toPublicPost(rawDoc as Record<string, unknown> & { _id: ObjectId });
    if (!pub.currentImageUrl) {
      return { ok: false, error: "貼文尚無可編輯的圖片" };
    }

    const element = pub.detectedElements.find((e) => e.id === input.elementId);
    if (!element) {
      return { ok: false, error: "請先在畫布上點選要修改的物件、人物或文字" };
    }

    const validation = validateEditPostElementInput({
      element,
      editMode: input.editMode,
      instruction: input.instruction,
      characterId: input.characterId,
      characterLookUrl: input.characterLookUrl,
      productId: input.productId,
      referenceImageUrl: input.referenceImageUrl,
    });
    if (!validation.ok) return validation;

    await assertCanSpendCredits(user, FRAME_COST);

    let donorImageUrl =
      input.characterLookUrl?.trim() || input.referenceImageUrl?.trim() || undefined;
    let characterName: string | undefined;
    let characterOutfitSpec: string | undefined;
    let productName: string | undefined;

    if (input.characterId && ObjectId.isValid(input.characterId)) {
      const charCol = await charactersCollection();
      const charDoc = (await charCol.findOne({
        _id: new ObjectId(input.characterId),
        clerkUserId: user.clerkUserId,
      })) as Character | null;
      if (charDoc) {
        const resolved = resolveCharacterDonorForSwap(charDoc, donorImageUrl);
        characterName = resolved.characterName;
        donorImageUrl = resolved.donorImageUrl || donorImageUrl;
        characterOutfitSpec = resolved.characterOutfitSpec;
      }
    }

    if (input.productId && ObjectId.isValid(input.productId)) {
      const prodCol = await productsCollection();
      const prodDoc = (await prodCol.findOne({
        _id: new ObjectId(input.productId),
        clerkUserId: user.clerkUserId,
      })) as Product | null;
      if (prodDoc?.blueprintUrl) {
        productName = prodDoc.name;
        donorImageUrl = prodDoc.blueprintUrl;
      }
    }

    const baseRequest = buildPostElementEditPrompt({
      element,
      editMode: input.editMode,
      instruction: input.instruction,
      characterName,
      characterOutfitSpec,
      productName,
      hasDonorImage: Boolean(donorImageUrl),
    });

    const isCharSwap =
      element.category === "person" &&
      input.editMode === "swap_character" &&
      Boolean(donorImageUrl);

    const referenceImageUrls = isCharSwap
      ? [donorImageUrl!, pub.currentImageUrl]
      : donorImageUrl
        ? [pub.currentImageUrl, donorImageUrl]
        : [pub.currentImageUrl];

    spendKey = await consumeCredits(user.clerkUserId, FRAME_COST);

    const refBuffers = (
      await Promise.all(referenceImageUrls.map((u) => downloadBuffer(u)))
    ).filter((b): b is Buffer => Boolean(b));

    const upsampledPrompt = await upsampleJutsuFramePrompt({
      baseRequest,
      imageBuffers: refBuffers,
    });

    const webpBuf = await generateSeedreamPostBuffer({
      prompt: upsampledPrompt,
      aspectRatio: pub.aspectRatio,
      referenceImageUrls,
    });

    const prefix = `explainer/posts/${user._id.toHexString()}/${pub.id}`;
    const nextRevNumber = pub.revisions.length + 1;
    const [newImageUrl, newElements] = await Promise.all([
      persistBuffer(
        webpBuf,
        `${prefix}/rev-${nextRevNumber}-${Date.now()}.webp`,
        "image/webp",
      ),
      segmentPostBuffer(webpBuf),
    ]);

    const summaryLabel = element.labelZh || element.label;
    const editSummary =
      input.editMode === "remove"
        ? `移除 ${summaryLabel}`
        : input.editMode === "swap_character"
          ? `替換 ${summaryLabel} → ${characterName || "角色"}`
          : input.editMode === "replace_product"
            ? `替換 ${summaryLabel} → ${productName || "產品"}`
            : `修改 ${summaryLabel}${input.instruction?.trim() ? `：${input.instruction.trim().slice(0, 24)}` : ""}`;

    const now = new Date();
    const newRevision: PostRevision = {
      revisionId: `rev-${nextRevNumber}`,
      imageUrl: newImageUrl,
      prompt: (input.instruction || baseRequest).trim(),
      editSummary,
      targetElementId: element.id,
      targetCategory: element.category,
      editMode: input.editMode,
      detectedElements: newElements,
      createdAt: now.toISOString(),
    };

    const updatedRevisions = [...pub.revisions, newRevision];
    await posts.updateOne(
      { _id: new ObjectId(pub.id), clerkUserId: user.clerkUserId },
      {
        $set: {
          status: "completed",
          currentImageUrl: newImageUrl,
          detectedElements: newElements,
          revisions: updatedRevisions,
          error: undefined,
          updatedAt: now,
        },
      },
    );

    const latest = await posts.findOne({
      _id: new ObjectId(pub.id),
      clerkUserId: user.clerkUserId,
    });
    try {
      revalidatePath("/app/posts");
    } catch {
      // Non-request context
    }
    return {
      ok: true,
      post: toPublicPost(
        (latest ?? {
          ...rawDoc,
          currentImageUrl: newImageUrl,
          detectedElements: newElements,
          revisions: updatedRevisions,
          updatedAt: now,
        }) as Record<string, unknown> & { _id: ObjectId },
      ),
    };
  } catch (error) {
    if (spendKey && clerkUserId) {
      await refundCredits(clerkUserId, FRAME_COST, spendKey).catch(() => {});
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "局部重繪失敗，請稍後再試",
    };
  }
}

export async function redetectPostElements(
  postId: string,
): Promise<{ ok: true; post: PublicPost } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(postId)) {
      return { ok: false, error: "找不到貼文" };
    }
    const posts = await postsCollection();
    const rawDoc = await posts.findOne({
      _id: new ObjectId(postId),
      clerkUserId: user.clerkUserId,
    });
    if (!rawDoc) {
      return { ok: false, error: "找不到貼文" };
    }
    const pub = toPublicPost(rawDoc as Record<string, unknown> & { _id: ObjectId });
    if (!pub.currentImageUrl) {
      return { ok: false, error: "貼文尚無圖片可供偵測" };
    }
    const imgBuf = await downloadBuffer(pub.currentImageUrl);
    if (!imgBuf) {
      return { ok: false, error: "無法下載貼文圖片" };
    }
    const detectedElements = await segmentPostBuffer(imgBuf);
    const updatedRevisions = pub.revisions.map((r) =>
      r.imageUrl === pub.currentImageUrl ? { ...r, detectedElements } : r,
    );
    const now = new Date();
    await posts.updateOne(
      { _id: new ObjectId(postId), clerkUserId: user.clerkUserId },
      {
        $set: {
          detectedElements,
          revisions: updatedRevisions,
          updatedAt: now,
        },
      },
    );
    return {
      ok: true,
      post: {
        ...pub,
        detectedElements,
        revisions: updatedRevisions,
        updatedAt: now.toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "元素偵測失敗",
    };
  }
}

export async function selectPostRevision(input: {
  postId: string;
  revisionId: string;
}): Promise<{ ok: true; post: PublicPost } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(input.postId)) {
      return { ok: false, error: "找不到貼文" };
    }
    const posts = await postsCollection();
    const rawDoc = await posts.findOne({
      _id: new ObjectId(input.postId),
      clerkUserId: user.clerkUserId,
    });
    if (!rawDoc) {
      return { ok: false, error: "找不到貼文" };
    }
    const pub = toPublicPost(rawDoc as Record<string, unknown> & { _id: ObjectId });
    const selected = applyRevisionSelection(pub.revisions, input.revisionId);
    if (!selected) {
      return { ok: false, error: "找不到指定的版本" };
    }
    const now = new Date();
    await posts.updateOne(
      { _id: new ObjectId(input.postId), clerkUserId: user.clerkUserId },
      {
        $set: {
          currentImageUrl: selected.currentImageUrl,
          detectedElements: selected.detectedElements,
          updatedAt: now,
        },
      },
    );
    try {
      revalidatePath("/app/posts");
    } catch {
      // Non-request context
    }
    return {
      ok: true,
      post: {
        ...pub,
        currentImageUrl: selected.currentImageUrl,
        detectedElements: selected.detectedElements,
        updatedAt: now.toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "切換版本失敗",
    };
  }
}

export async function deletePostJob(
  postId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(postId)) {
      return { ok: false, error: "找不到貼文" };
    }
    const posts = await postsCollection();
    await posts.deleteOne({
      _id: new ObjectId(postId),
      clerkUserId: user.clerkUserId,
    });
    try {
      revalidatePath("/app/posts");
    } catch {
      // Non-request context
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "刪除貼文失敗",
    };
  }
}

export async function listOwnedPosts(
  clerkUserId: string,
  limit = 60,
): Promise<PublicPost[]> {
  const posts = await postsCollection();
  const docs = await posts
    .find({ clerkUserId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) =>
    toPublicPost(doc as unknown as Record<string, unknown> & { _id: ObjectId }),
  );
}

export async function loadOwnedPost(
  postId: string,
  clerkUserId: string,
): Promise<PublicPost | null> {
  if (!ObjectId.isValid(postId)) return null;
  const posts = await postsCollection();
  const doc = await posts.findOne({ _id: new ObjectId(postId), clerkUserId });
  if (!doc) return null;
  return toPublicPost(doc as unknown as Record<string, unknown> & { _id: ObjectId });
}
