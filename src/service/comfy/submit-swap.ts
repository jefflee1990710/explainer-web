import type { JutsuJob } from "@/model/jutsu-job";
import type { TeleportJob } from "@/model/teleport-job";
import { ensureMp4HasAudioStream } from "@/service/comfy/ensure-audio";
import {
  hasComfyEndpoint,
  openJutsuMargin,
  submitOpenJutsuObject,
  submitOpenJutsuSimple,
  type ComfySubmitResult,
} from "@/service/comfy/openjutsu-client";

// Character swap uses OpenJutsu simple. Object swap uses the object workflow.
// Still images, relight, and color fix stay on the cloud path.
export async function trySubmitJutsuComfy(
  job: JutsuJob & { _id: { toHexString(): string } },
): Promise<ComfySubmitResult | null> {
  if (!hasComfyEndpoint()) return null;
  if (job.sourceMediaKind === "image") return null;
  if (job.mode !== "character_swap" && job.mode !== "object_swap") return null;

  const rawVideo = await fetchMedia(job.sourceVideoUrl);
  const video = await ensureMp4HasAudioStream(rawVideo);
  const runId = job._id.toHexString();
  const section = { start: job.sectionStart, length: job.sectionLength };
  const shared = {
    video,
    section,
    margin: openJutsuMargin(job.maskMargin),
    motion: job.motionSize ?? 512,
    seed: 0,
    runId,
  } as const;

  if (job.mode === "character_swap") {
    const imageUrl =
      job.personMappings?.find((mapping) => mapping.referenceImageUrl)?.referenceImageUrl ||
      job.referenceImageUrl;
    if (!imageUrl) throw new Error("缺少角色參考圖片");
    const image = await fetchMedia(imageUrl);
    return submitOpenJutsuSimple({
      ...shared,
      image,
      imageName: fileName(imageUrl, "person.jpg"),
      role: job.characterName ?? "",
      target: "person",
      hatFix: Boolean(job.hatFix),
      noLipSync: Boolean(job.noLipSync),
    });
  }

  const mode = job.objectEditMode ?? "change";
  const imageUrl = mode === "remove" ? undefined : job.referenceImageUrl;
  const image = imageUrl ? await fetchMedia(imageUrl) : null;
  return submitOpenJutsuObject({
    ...shared,
    image,
    imageName: imageUrl ? fileName(imageUrl, "object.jpg") : "object.jpg",
    mode,
    target: job.objectTarget?.trim() || "person",
    changeTo: job.objectChangeTo?.trim() || "",
    biggestOnly: false,
    keepOutline: true,
  });
}

// Teleport is OpenJutsu object mode "background": the person stays, the setting is replaced.
export async function trySubmitTeleportComfy(
  job: TeleportJob & { _id: { toHexString(): string } },
): Promise<ComfySubmitResult | null> {
  if (!hasComfyEndpoint()) return null;
  if (!job.sceneImageUrl) throw new Error("缺少場景圖片");
  const [rawVideo, image] = await Promise.all([
    fetchMedia(job.sourceVideoUrl),
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

async function fetchMedia(url: string) {
  const response = await fetch(url);
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
