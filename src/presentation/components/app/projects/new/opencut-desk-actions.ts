import {
  saveOpencutEditAction,
  uploadOpencutMediaAction,
} from "@/presentation/actions/opencut-edit";
import { syncOpencutSubtitlePlatesAction } from "@/presentation/actions/opencut-subtitle";
import type { OpencutEditMedia } from "@/model/opencut-edit";
import type {
  ScroProjectSaveMessage,
  ScroSubtitleGenerateResultMessage,
} from "@/service/opencut/messages";

// Uploads any newly dropped local blobs and persists the OpenCut timeline document.
export async function persistOpencutProjectSave(
  projectId: string,
  data: ScroProjectSaveMessage,
) {
  if (data.videoId !== projectId) return;
  const uploaded: OpencutEditMedia[] = [];
  for (const item of data.uploads ?? []) {
    if (!item.blob || !item.id) continue;
    const body = new FormData();
    body.set("videoId", projectId);
    body.set("mediaId", item.id);
    body.set(
      "file",
      new File([item.blob], item.name || "asset", {
        type: item.blob.type || "application/octet-stream",
      }),
    );
    const result = await uploadOpencutMediaAction(body);
    if (!result.ok) continue;
    uploaded.push({
      id: item.id,
      name: item.name,
      type: item.type,
      sourceUrl: result.url,
      width: item.width,
      height: item.height,
      duration: item.duration,
    });
  }
  await saveOpencutEditAction({
    videoId: projectId,
    project: data.project,
    media: [...(data.media ?? []), ...uploaded],
  });
}

// Polls subtitle plate generation until all requested clips have URLs or timeout/failure occurs.
export async function pollOpencutSubtitlePlates(
  projectId: string,
  payload: {
    videoId: string;
    textStyleId: string;
    clipNumbers: number[];
  },
): Promise<ScroSubtitleGenerateResultMessage | null> {
  if (payload.videoId !== projectId) return null;
  const wanted = [...new Set(payload.clipNumbers)];
  const urlByClip = new Map<number, string>();
  const deadline = Date.now() + 8 * 60 * 1000;
  let lastError: string | undefined;

  while (Date.now() < deadline) {
    const missing = wanted.filter((clipNumber) => !urlByClip.has(clipNumber));
    if (missing.length === 0) break;
    const result = await syncOpencutSubtitlePlatesAction({
      videoId: payload.videoId,
      textStyleId: payload.textStyleId,
      clipNumbers: missing,
    });
    if (!result.ok) {
      lastError = result.error;
      break;
    }
    for (const plate of result.plates) urlByClip.set(plate.clipNumber, plate.url);
    if (result.failed.length > 0) {
      lastError = result.failed.map((item) => item.error).join("；");
      break;
    }
    if (result.pending.length === 0 && missing.some((clipNumber) => !urlByClip.has(clipNumber))) {
      lastError = "部分字幕圖無法產生";
      break;
    }
    if (result.pending.length === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  if (!lastError && wanted.some((clipNumber) => !urlByClip.has(clipNumber))) {
    lastError = "字幕圖產生逾時";
  }

  return {
    type: "scro-subtitle-generate-result",
    videoId: payload.videoId,
    ok: !lastError && wanted.every((clipNumber) => urlByClip.has(clipNumber)),
    plates: wanted.flatMap((clipNumber) => {
      const url = urlByClip.get(clipNumber);
      return url ? [{ clipNumber, url }] : [];
    }),
    error: lastError,
  };
}
