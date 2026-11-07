import sharp from "sharp";
import { normalizeJutsuReferenceUrls, type JutsuJob } from "@/model/jutsu-job";
import type { TeleportJob } from "@/model/teleport-job";
import { ensureMp4HasAudioStream } from "@/service/comfy/ensure-audio";
import {
  hasComfyEndpoint,
  openJutsuMargin,
  submitOpenJutsuObject,
  submitOpenJutsuSimple,
  type ComfySubmitResult,
} from "@/service/comfy/openjutsu-client";

export function resolveJobCharacterReferenceUrls(
  job: Pick<JutsuJob, "referenceImageUrl" | "referenceImageUrls" | "personMappings">,
): string[] {
  const mapped = job.personMappings?.find(
    (m) => (m.referenceImageUrls && m.referenceImageUrls.length > 0) || m.referenceImageUrl,
  );
  if (mapped) {
    return normalizeJutsuReferenceUrls(mapped.referenceImageUrls, mapped.referenceImageUrl);
  }
  return normalizeJutsuReferenceUrls(job.referenceImageUrls, job.referenceImageUrl);
}

export function resolveJobCharacterOutfitSpec(
  job: Pick<JutsuJob, "characterOutfitSpec" | "personMappings">,
): string | undefined {
  const mappedOutfit = job.personMappings
    ?.find((m) => m.characterOutfitSpec?.trim())
    ?.characterOutfitSpec?.trim();
  if (mappedOutfit) return mappedOutfit;
  return job.characterOutfitSpec?.trim() || undefined;
}

/**
 * When a user uploads 2..6 reference photos of the same target character, stitch them into a
 * single clean multi-angle reference sheet so ComfyUI's `Picture 1` (`Describe picture 1`,
 * `H3OneClickSwapPlan`, and `MiniMaxH3ReferenceToVideo`) sees all angles and clothing details
 * without mistaking them for multiple people in the video.
 */
export async function composeJutsuCharacterReferenceSheet(
  imageBuffers: readonly Buffer[],
): Promise<Buffer> {
  if (imageBuffers.length === 0) {
    throw new Error("缺少角色參考圖片");
  }
  if (imageBuffers.length === 1) {
    return imageBuffers[0]!;
  }

  const slices = imageBuffers.slice(0, 6);
  const count = slices.length;
  const cols = count <= 3 ? count : Math.ceil(count / 2);
  const rows = Math.ceil(count / cols);
  const tileW = 640;
  const tileH = 960;
  const gap = 16;
  const canvasW = cols * tileW + (cols + 1) * gap;
  const canvasH = rows * tileH + (rows + 1) * gap;
  const bg = { r: 24, g: 24, b: 27 };

  const composites = await Promise.all(
    slices.map(async (buf, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const tileBuf = await sharp(buf)
        .rotate()
        .resize(tileW, tileH, {
          fit: "contain",
          background: { ...bg, alpha: 1 },
        })
        .flatten({ background: bg })
        .png()
        .toBuffer();
      return {
        input: tileBuf,
        left: gap + col * (tileW + gap),
        top: gap + row * (tileH + gap),
      };
    }),
  );

  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 3,
      background: bg,
    },
  })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toBuffer();
}

export function canSubmitJutsuComfy(
  job: Pick<
    JutsuJob,
    | "sourceMediaKind"
    | "mode"
    | "relightId"
    | "customLightPrompt"
    | "personMappings"
    | "totalDetectedPeople"
  >,
): boolean {
  if (!hasComfyEndpoint()) return false;
  if (job.sourceMediaKind === "image") return false;
  if (job.mode !== "character_swap" && job.mode !== "object_swap") return false;
  if (Boolean(job.relightId?.trim() || job.customLightPrompt?.trim())) return false;
  const mappedCount = job.personMappings?.length ?? 0;
  if (mappedCount > 1) return false;
  if (mappedCount === 1 && (job.totalDetectedPeople ?? 1) > 1) return false;
  return true;
}

/**
 * Upgrade the 512px grey-mannequin motion reference to 768px when the subject occupies
 * less than 45% of the frame height (distant/wide full-body shots like road walks).
 */
export function resolveComfySwapMotionSize(
  job: Pick<JutsuJob, "motionSize" | "personMappings">,
): 512 | 768 | 1376 {
  const base = job.motionSize ?? 512;
  if (base !== 512) return base;
  const hasSmallSubject = (job.personMappings ?? []).some(
    (m) => Number.isFinite(m.box?.height) && m.box.height > 0 && m.box.height < 0.45,
  );
  return hasSmallSubject ? 768 : 512;
}

// Character swap uses OpenJutsu simple. Object swap uses the object workflow.
// Still images, relight, multi-person scenes, and color fix stay on the cloud path.
export async function trySubmitJutsuComfy(
  job: JutsuJob & { _id: { toHexString(): string } },
  preloadedVideoBuffer?: Buffer,
  fetchFn: typeof fetch = fetch,
): Promise<ComfySubmitResult | null> {
  if (!canSubmitJutsuComfy(job)) return null;

  const rawVideo =
    preloadedVideoBuffer ?? (await fetchMedia(job.sourceVideoUrl, fetchFn));
  const video = await ensureMp4HasAudioStream(rawVideo);
  const runId = job._id.toHexString();
  const section = {
    start: job.sourceMediaKind === "gif" ? 0 : job.sectionStart,
    length: job.sectionLength,
  };
  const shared = {
    video,
    section,
    margin: openJutsuMargin(job.maskMargin),
    motion: resolveComfySwapMotionSize(job),
    seed: 0,
    runId,
  } as const;

  if (job.mode === "character_swap") {
    const imageUrls = resolveJobCharacterReferenceUrls(job);
    if (imageUrls.length === 0) throw new Error("缺少角色參考圖片");
    const rawImages = await Promise.all(imageUrls.map((u) => fetchMedia(u, fetchFn)));
    const image = await composeJutsuCharacterReferenceSheet(rawImages);
    const imageName =
      imageUrls.length > 1
        ? `person_sheet_${runId}.jpg`
        : fileName(imageUrls[0]!, "person.jpg");
    return submitOpenJutsuSimple(
      {
        ...shared,
        image,
        imageName,
        // Leave `role` blank so OpenJutsu Node 10 (`video_people`) auto-detects the original person's
        // role + clothes ("1. the walker - woman in dark jacket and black fringed scarf") and `H3FillShots`
        // strips the original person's clothing from the shot descriptions.
        role: "",
        target: "person",
        outfitSpec: resolveJobCharacterOutfitSpec(job),
        hatFix: Boolean(job.hatFix),
        noLipSync: Boolean(job.noLipSync),
      },
      fetchFn,
    );
  }

  const mode = job.objectEditMode ?? "change";
  const imageUrl = mode === "remove" ? undefined : job.referenceImageUrl;
  const image = imageUrl ? await fetchMedia(imageUrl, fetchFn) : null;
  return submitOpenJutsuObject(
    {
      ...shared,
      image,
      imageName: imageUrl ? fileName(imageUrl, "object.jpg") : "object.jpg",
      mode,
      target: job.objectTarget?.trim() || "person",
      changeTo: job.objectChangeTo?.trim() || "",
      biggestOnly: false,
      keepOutline: true,
    },
    fetchFn,
  );
}

// Teleport is OpenJutsu object mode "background": the person stays, the setting is replaced.
export async function trySubmitTeleportComfy(
  job: TeleportJob & { _id: { toHexString(): string } },
  preloadedVideoBuffer?: Buffer,
): Promise<ComfySubmitResult | null> {
  if (!hasComfyEndpoint()) return null;
  if (!job.sceneImageUrl) throw new Error("缺少場景圖片");
  const [rawVideo, image] = await Promise.all([
    preloadedVideoBuffer ? Promise.resolve(preloadedVideoBuffer) : fetchMedia(job.sourceVideoUrl),
    fetchMedia(job.sceneImageUrl),
  ]);
  const video = await ensureMp4HasAudioStream(rawVideo);
  return submitOpenJutsuObject({
    video,
    image,
    imageName: fileName(job.sceneImageUrl, "scene.jpg"),
    section: { start: job.sectionStart, length: job.sectionLength },
    mode: "background",
    target: "person",
    changeTo: job.scenePrompt?.trim() || "the place in the reference picture",
    biggestOnly: false,
    keepOutline: true,
    margin: "normal",
    motion: 512,
    seed: 0,
    runId: job._id.toHexString(),
  });
}

async function fetchMedia(url: string, fetchFn: typeof fetch = fetch) {
  const response = await fetchFn(url);
  if (!response.ok) throw new Error(`無法下載素材（HTTP ${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

function fileName(url: string, fallback: string) {
  try {
    const name = new URL(url).pathname.split("/").pop() || fallback;
    return name.replace(/[^\w.\-]+/g, "_").slice(-80) || fallback;
  } catch {
    return fallback;
  }
}
