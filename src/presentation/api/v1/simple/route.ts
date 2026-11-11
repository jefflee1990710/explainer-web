import { fromResult, readJson, withApiUser } from "@/service/api/respond";
import { createSimpleVideoAction } from "@/service/project/actions";
import type { AspectRatio, VideoQualityTier } from "@/model/project";

// POST /api/v1/simple — Camera-first single-shot silent video generation.
export const POST = withApiUser(async ({ request }) => {
  const body = await readJson<{
    prompt?: string;
    aspectRatio?: AspectRatio;
    durationSeconds?: number;
    styleId?: string;
    videoQualityTier?: VideoQualityTier;
    firstFrameUrl?: string;
    lastFrameUrl?: string;
    characterId?: string;
    referenceImageUrls?: string[];
    refVideoUrl?: string;
    refAudioUrl?: string;
  }>(request);

  return fromResult(
    await createSimpleVideoAction({
      prompt: String(body.prompt ?? ""),
      aspectRatio: body.aspectRatio,
      durationSeconds: body.durationSeconds,
      styleId: body.styleId,
      videoQualityTier: body.videoQualityTier,
      firstFrameUrl: body.firstFrameUrl,
      lastFrameUrl: body.lastFrameUrl,
      characterId: body.characterId,
      referenceImageUrls: body.referenceImageUrls,
      refVideoUrl: body.refVideoUrl,
      refAudioUrl: body.refAudioUrl,
    }),
    201,
  );
});
