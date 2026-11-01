import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateText } from "ai";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { videosCollection } from "@/dao";
import type { VoLanguage } from "@/model/project";
import { toPublicVideo, type PublicVideo } from "@/presentation/serialize";
import { requireAppUser } from "@/service/auth";
import { generateClipVideoAction } from "@/service/clip/production";
import { isVoLanguage } from "@/service/director/languages";
import { directorModel } from "@/service/director/model";
import { TALKING_HEAD_MAX_SECONDS } from "@/service/director/talking-head";
import { folderVideoPath } from "@/service/folder-video-path";
import { persistBuffer } from "@/service/higgsfield/persist";
import { runFfmpeg } from "@/service/reel/concat";
import { blobStoreHost, brandAssetPath, isBrandAssetUrl } from "@/service/video-edit/edit-state";
import { probeAudioSeconds } from "@/service/voice/voice-swap";

export const VO_AUDIO_MAX_BYTES = 25 * 1024 * 1024;
export const VO_AUDIO_MIN_SECONDS = 2;
export const VO_AUDIO_MAX_SECONDS = TALKING_HEAD_MAX_SECONDS;

const ALLOWED_VO_MIMES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/webm",
  "audio/ogg",
  "video/webm",
  "video/mp4",
]);

export function isAllowedVoAudioMime(mime?: string | null): boolean {
  if (!mime) return false;
  const base = mime.split(";")[0]?.trim().toLowerCase() || "";
  return ALLOWED_VO_MIMES.has(base);
}

export function parseUploadedVoInput(
  rawUrl: string,
  rawDuration: string,
  isAllowedUrl: (url: string) => boolean,
):
  | { ok: true; url?: string; durationSeconds?: number }
  | { ok: false; error: string } {
  const url = rawUrl.trim();
  if (!url) {
    return { ok: true, url: undefined, durationSeconds: undefined };
  }
  if (!isAllowedUrl(url)) {
    return { ok: false, error: "VO 音訊檔案無效，請重新上傳或錄音" };
  }
  const parsedSec = Number(rawDuration);
  const clamped =
    Number.isFinite(parsedSec) && parsedSec > 0
      ? Math.min(VO_AUDIO_MAX_SECONDS, Math.max(5, Math.ceil(parsedSec)))
      : undefined;
  return {
    ok: true,
    url,
    durationSeconds: clamped,
  };
}

/** Split a spoken transcript by punctuation and strip punctuation marks for clean subtitle cues. */
export function splitTranscriptIntoSubtitleCues(text: string): string[] {
  return text
    .split(
      /(?:[。！？!?；;，,、：:「」『』“”【】（）()…—–]+|(?<=\b[A-Za-z0-9'")\]]{2,})\.(?=\s|$))\s*/u,
    )
    .map((part) =>
      part
        .replace(/[。！？!?；;，,、：:「」『』“”【】（）()…—–]+/gu, " ")
        .replace(/(^|\s)['"‘’]+|['"‘’]+(?=\s|$)/gu, " ")
        .replace(/\.(?=\s|$)|^\.+/gu, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

/** Transcode any uploaded or browser-recorded audio buffer into a clean 44.1kHz 192kbps MP3 and probe its duration. */
export async function normalizeVoAudioToMp3(
  buffer: Buffer,
  ext: string,
): Promise<{ mp3Buffer: Buffer; durationSeconds: number } | null> {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "webm";
  const dir = await mkdtemp(join(tmpdir(), "vo-norm-"));
  try {
    const inFile = `in.${safeExt}`;
    const outFile = "out.mp3";
    await writeFile(join(dir, inFile), buffer);
    await runFfmpeg(dir, [
      "-y",
      "-i",
      inFile,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-ar",
      "44100",
      "-ac",
      "1",
      "-b:a",
      "192k",
      outFile,
    ]);
    const mp3Buffer = await readFile(join(dir, outFile));
    const seconds = await probeAudioSeconds(mp3Buffer, "mp3");
    if (seconds === null || seconds <= 0) return null;
    return { mp3Buffer, durationSeconds: Math.round(seconds * 10) / 10 };
  } catch {
    const fallbackSeconds = await probeAudioSeconds(buffer, safeExt);
    if (fallbackSeconds === null || fallbackSeconds <= 0) return null;
    return { mp3Buffer: buffer, durationSeconds: Math.round(fallbackSeconds * 10) / 10 };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Auto-transcribe an MP3 audio buffer into spoken script using Gemini multimodal audio. */
export async function transcribeVoAudioBuffer(
  mp3Buffer: Buffer,
  language?: VoLanguage,
): Promise<string> {
  const langHint =
    language === "yue"
      ? "Write natural colloquial Hong Kong Cantonese (廣東話口語，例如「係、喺、嘅、咁、冇、唔」) with natural punctuation."
      : language === "zh"
        ? "Write natural Traditional Chinese (繁體中文) with natural punctuation."
        : language === "ja"
          ? "Write natural Japanese with punctuation."
          : "Write natural English (or the spoken language in the audio) with natural punctuation.";

  try {
    const { text } = await generateText({
      model: directorModel(),
      system: [
        "You are an accurate speech-to-text transcriber for short-form creator videos.",
        "Transcribe the spoken words in the attached audio verbatim.",
        langHint,
        "Output ONLY the spoken transcript text — no timestamps, no speaker labels, no markdown, no commentary.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: [{ type: "file", data: mp3Buffer, mediaType: "audio/mpeg" }],
        },
      ],
    });
    return text.trim();
  } catch (err) {
    console.warn("[vo-upload] Gemini audio transcription failed:", err);
    return "";
  }
}

export type UploadTalkingHeadVoResult =
  | {
      ok: true;
      url: string;
      durationSeconds: number;
      transcript: string;
      subtitleCues: string[];
    }
  | { ok: false; error: string };

/** Upload or record a VO audio file for a Talking-Head video, normalize to MP3, and auto-transcribe. */
export async function uploadTalkingHeadVoAction(
  formData: FormData,
): Promise<UploadTalkingHeadVoResult> {
  try {
    const user = await requireAppUser();
    const file = formData.get("file");
    const rawLang = String(formData.get("language") || "").trim();
    const language: VoLanguage | undefined = isVoLanguage(rawLang) ? rawLang : undefined;

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "請選擇或錄製一段語音檔" };
    }
    if (file.size > VO_AUDIO_MAX_BYTES) {
      return { ok: false, error: "語音檔不可超過 25MB" };
    }
    if (file.type && !isAllowedVoAudioMime(file.type)) {
      return { ok: false, error: "只支援 MP3、WAV、M4A、WebM、OGG 語音檔" };
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "webm").toLowerCase();
    const normalized = await normalizeVoAudioToMp3(rawBuffer, ext);
    if (!normalized) {
      return { ok: false, error: "無法讀取語音檔，請確認檔案格式" };
    }
    if (
      normalized.durationSeconds < VO_AUDIO_MIN_SECONDS ||
      normalized.durationSeconds > VO_AUDIO_MAX_SECONDS
    ) {
      return {
        ok: false,
        error: `VO 語音長度需為 ${VO_AUDIO_MIN_SECONDS}–${VO_AUDIO_MAX_SECONDS} 秒（目前為 ${Math.round(normalized.durationSeconds)} 秒）`,
      };
    }

    const assetId = `vo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const blobPath = brandAssetPath(user.clerkUserId, assetId, "mp3");
    const [url, transcript] = await Promise.all([
      persistBuffer(normalized.mp3Buffer, blobPath, "audio/mpeg"),
      transcribeVoAudioBuffer(normalized.mp3Buffer, language),
    ]);

    return {
      ok: true,
      url,
      durationSeconds: normalized.durationSeconds,
      transcript,
      subtitleCues: splitTranscriptIntoSubtitleCues(transcript),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "上傳 VO 語音失敗",
    };
  }
}

export type UpdateClipVoResult =
  | { ok: true; project: PublicVideo }
  | { ok: false; error: string };

/**
 * Save a newly recorded or uploaded VO audio onto a clip in the Editor, updating its
 * spoken script (`englishVo`), `subtitleCues`, `durationSeconds`, and `uploadedVoUrl`,
 * and optionally immediately enqueueing `generateClipVideoAction` to regenerate the clip video.
 */
export async function updateClipUploadedVoAction(input: {
  videoId: string;
  clipNumber: number;
  voUrl: string;
  durationSeconds: number;
  transcript?: string;
  regenerateVideo?: boolean;
}): Promise<UpdateClipVoResult> {
  try {
    const user = await requireAppUser();
    if (!ObjectId.isValid(input.videoId)) {
      return { ok: false, error: "專案不存在" };
    }
    const storeHost = blobStoreHost(process.env.BLOB_READ_WRITE_TOKEN);
    if (!isBrandAssetUrl(input.voUrl, user.clerkUserId, storeHost)) {
      return { ok: false, error: "VO 音訊檔案無效，請重新錄音或上傳" };
    }

    const videos = await videosCollection();
    const video = await videos.findOne({
      _id: new ObjectId(input.videoId),
      clerkUserId: user.clerkUserId,
    });
    if (!video?.phaseA) {
      return { ok: false, error: "找不到分鏡資料" };
    }

    const clipRow = video.phaseA.clips.find((c) => c.clipNumber === input.clipNumber);
    if (!clipRow) {
      return { ok: false, error: "找不到這段分鏡" };
    }

    const clampedDuration = Math.min(
      VO_AUDIO_MAX_SECONDS,
      Math.max(5, Math.ceil(input.durationSeconds || clipRow.durationSeconds)),
    );
    const nextSpoken = (input.transcript ?? "").trim() || clipRow.englishVo;
    const nextCues = splitTranscriptIntoSubtitleCues(nextSpoken);
    const nowIso = new Date().toISOString();

    const nextPhaseAClips = video.phaseA.clips.map((c) => {
      if (c.clipNumber !== input.clipNumber) return c;
      return {
        ...c,
        englishVo: nextSpoken,
        durationSeconds: clampedDuration,
        timeRange: `0–${clampedDuration}s`,
        uploadedVoUrl: input.voUrl,
        uploadedVoDurationSeconds: input.durationSeconds,
        ...(nextCues.length > 0 ? { subtitleCues: nextCues } : {}),
        editedAt: nowIso,
      };
    });

    await videos.updateOne(
      { _id: video._id },
      {
        $set: {
          "phaseA.clips": nextPhaseAClips,
          ...(input.clipNumber === 1
            ? {
                uploadedVoUrl: input.voUrl,
                uploadedVoDurationSeconds: input.durationSeconds,
                spokenScript: nextSpoken,
              }
            : {}),
          updatedAt: new Date(),
        },
      },
    );

    if (input.regenerateVideo) {
      const regen = await generateClipVideoAction(input.videoId, input.clipNumber);
      if (!regen.ok) return regen;
      return { ok: true, project: regen.project };
    }

    const updated = await videos.findOne({ _id: video._id });
    revalidatePath(
      folderVideoPath(video.projectId?.toHexString(), video._id.toHexString()),
    );
    return { ok: true, project: toPublicVideo(updated!) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "更新錄音失敗",
    };
  }
}
