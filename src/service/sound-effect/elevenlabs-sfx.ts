import { ObjectId } from "mongodb";
import { soundEffectsCollection } from "@/dao/sound-effects";
import {
  SOUND_EFFECT_CATEGORIES,
  type SoundEffectCategoryId,
  type SoundEffectSourceFilter,
} from "@/opencut/sounds/types";
import { persistBuffer } from "@/service/higgsfield/persist";
import type { LibrarySound } from "@/service/sound-effect/library";
import { probeAudioSeconds } from "@/service/voice/voice-swap";

export {
  SOUND_EFFECT_CATEGORIES,
  type SoundEffectCategoryId,
  type SoundEffectSourceFilter,
};

const ELEVENLABS_SFX_URL = "https://api.elevenlabs.io/v1/sound-generation";

type FetchOptions = {
  apiKey?: string;
  fetch?: typeof fetch;
};

function apiKey(override?: string) {
  const key = (override ?? process.env.ELEVENLABS_API_KEY ?? "").trim();
  if (!key) throw new Error("尚未設定 ELEVENLABS_API_KEY");
  return key;
}

export async function generateElevenLabsSoundBytes(
  input: {
    text: string;
    durationSeconds?: number;
    promptInfluence?: number;
  },
  options?: FetchOptions,
): Promise<Buffer> {
  const prompt = input.text.trim();
  if (!prompt) throw new Error("請輸入音效描述");
  const fetchFn = options?.fetch ?? fetch;
  const duration = input.durationSeconds
    ? Math.min(22, Math.max(0.5, Number(input.durationSeconds)))
    : undefined;
  const response = await fetchFn(ELEVENLABS_SFX_URL, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey(options?.apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: prompt,
      ...(duration ? { duration_seconds: duration } : {}),
      prompt_influence: input.promptInfluence ?? 0.35,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs 音效生成失敗（${response.status}）${detail.slice(0, 160)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function createAndPersistElevenLabsSound(input: {
  text: string;
  category?: SoundEffectCategoryId;
  durationSeconds?: number;
}): Promise<LibrarySound> {
  const prompt = input.text.trim();
  const audioBuffer = await generateElevenLabsSoundBytes({
    text: prompt,
    durationSeconds: input.durationSeconds,
  });
  const probed = await probeAudioSeconds(audioBuffer, "mp3").catch(() => null);
  const duration = probed ?? input.durationSeconds ?? 2;
  const id = `el-sfx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pathname = `explainer/sound-effects/${id}.mp3`;
  const blobUrl = await persistBuffer(audioBuffer, pathname, "audio/mpeg");

  const tags = [
    "elevenlabs",
    ...(input.category && input.category !== "all" ? [input.category] : []),
    ...prompt
      .toLowerCase()
      .split(/[^a-z0-9\u4e00-\u9fa5]+/)
      .filter((w) => w.length >= 2)
      .slice(0, 8),
  ];

  const collection = await soundEffectsCollection();
  const now = new Date();
  await collection.insertOne({
    _id: new ObjectId(),
    source: "elevenlabs" as unknown as "kenney",
    sourceId: id,
    pack: input.category || "elevenlabs",
    name: prompt.slice(0, 80),
    filename: `${id}.mp3`,
    blobPath: pathname,
    blobUrl,
    contentType: "audio/mpeg",
    bytes: audioBuffer.length,
    durationSec: Number(duration.toFixed(2)),
    license: "CC0-1.0",
    licenseUrl: "https://elevenlabs.io/sound-effects",
    credit: "ElevenLabs AI",
    description: prompt,
    tags,
    descriptionEmbedding: [],
    embeddingModel: "gemini-embedding-001",
    embeddingDimensions: 768,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    name: prompt.slice(0, 80),
    description: `ElevenLabs AI · ${prompt}`,
    previewUrl: blobUrl,
    duration: Number(duration.toFixed(2)),
    username: "ElevenLabs AI",
    tags,
    license: "ElevenLabs Commercial",
  };
}

export async function searchSavedElevenLabsSounds(input: {
  query?: string;
  category?: SoundEffectCategoryId;
  limit?: number;
}): Promise<LibrarySound[]> {
  const collection = await soundEffectsCollection();
  const filter: Record<string, unknown> = { source: "elevenlabs" };
  const conditions: Record<string, unknown>[] = [];
  if (input.category && input.category !== "all") {
    conditions.push({
      $or: [{ pack: input.category }, { tags: input.category }],
    });
  }
  const q = (input.query ?? "").trim();
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    conditions.push({
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
      ],
    });
  }
  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const docs = await collection
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(input.limit ?? 30)
    .toArray();

  return docs.map((doc) => ({
    id: doc.sourceId,
    name: doc.name,
    description: `ElevenLabs AI · ${doc.description || doc.name}`,
    previewUrl: doc.blobUrl,
    duration: doc.durationSec ?? 2,
    username: "ElevenLabs AI",
    tags: doc.tags ?? ["elevenlabs"],
    license: "ElevenLabs Commercial",
  }));
}
