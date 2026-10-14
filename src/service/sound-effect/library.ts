import { google } from "@ai-sdk/google";
import { embed } from "ai";
import { soundEffectsCollection } from "@/dao/sound-effects";
import {
  SOUND_EFFECT_EMBEDDING_DIMENSIONS,
  SOUND_EFFECT_EMBEDDING_MODEL,
  SOUND_EFFECT_VECTOR_INDEX,
} from "@/model/sound-effect";

export const SOUND_EFFECT_PAGE_SIZE = 24;

// What the editor list needs. Embeddings stay in MongoDB.
export type LibrarySound = {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  duration: number;
  username: string;
  tags: string[];
  license: string;
};

type LibraryDoc = {
  sourceId?: string;
  name?: string;
  description?: string;
  blobUrl?: string;
  durationSec?: number | null;
  tags?: string[];
  license?: string;
  credit?: string;
};

export function soundEffectPageBounds(page: number, pageSize = SOUND_EFFECT_PAGE_SIZE) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Math.min(60, Math.max(1, Math.floor(pageSize)));
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize };
}

export function librarySoundFromDoc(doc: LibraryDoc): LibrarySound | null {
  if (!doc.sourceId || !doc.name || !doc.blobUrl) return null;
  return {
    id: doc.sourceId,
    name: doc.name,
    description: doc.description ?? "",
    previewUrl: doc.blobUrl,
    duration: doc.durationSec ?? 0,
    username: doc.credit ?? "Kenney",
    tags: doc.tags ?? [],
    license: doc.license ?? "CC0-1.0",
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LIST_PROJECTION = {
  sourceId: 1,
  name: 1,
  description: 1,
  blobUrl: 1,
  durationSec: 1,
  tags: 1,
  license: 1,
  credit: 1,
} as const;

async function embedSoundQuery(query: string) {
  const { embedding } = await embed({
    model: google.embeddingModel(SOUND_EFFECT_EMBEDDING_MODEL),
    value: query,
    providerOptions: {
      google: {
        outputDimensionality: SOUND_EFFECT_EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });
  if (embedding.length !== SOUND_EFFECT_EMBEDDING_DIMENSIONS) {
    throw new Error("音效搜尋向量長度不正確");
  }
  return embedding;
}

async function listByName(skip: number, pageSize: number) {
  const collection = await soundEffectsCollection();
  const filter = { source: "kenney" as const };
  const count = await collection.countDocuments(filter);
  const docs = await collection
    .find(filter, { projection: LIST_PROJECTION })
    .sort({ name: 1, sourceId: 1 })
    .skip(skip)
    .limit(pageSize)
    .toArray();
  const results = docs.flatMap((doc) => {
    const sound = librarySoundFromDoc(doc);
    return sound ? [sound] : [];
  });
  return { results, count, hasNext: skip + results.length < count };
}

async function listByText(query: string, skip: number, pageSize: number) {
  const collection = await soundEffectsCollection();
  const pattern = escapeRegex(query);
  const filter = {
    source: "kenney" as const,
    $or: [
      { name: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
      { tags: { $regex: pattern, $options: "i" } },
    ],
  };
  const count = await collection.countDocuments(filter);
  const docs = await collection
    .find(filter, { projection: LIST_PROJECTION })
    .sort({ name: 1, sourceId: 1 })
    .skip(skip)
    .limit(pageSize)
    .toArray();
  const results = docs.flatMap((doc) => {
    const sound = librarySoundFromDoc(doc);
    return sound ? [sound] : [];
  });
  return { results, count, hasNext: skip + results.length < count };
}

async function listByVector(query: string, skip: number, pageSize: number) {
  const embedding = await embedSoundQuery(query);
  const collection = await soundEffectsCollection();
  // One extra hit so the page can tell whether another page exists.
  const limit = skip + pageSize + 1;
  const docs = await collection
    .aggregate<LibraryDoc>([
      {
        $vectorSearch: {
          index: SOUND_EFFECT_VECTOR_INDEX,
          path: "descriptionEmbedding",
          queryVector: embedding,
          numCandidates: Math.min(10_000, Math.max(limit * 20, 200)),
          limit,
          filter: { source: "kenney" },
        },
      },
      { $skip: skip },
      { $limit: pageSize + 1 },
      { $project: LIST_PROJECTION },
    ])
    .toArray();
  const sounds = docs.flatMap((doc) => {
    const sound = librarySoundFromDoc(doc);
    return sound ? [sound] : [];
  });
  const hasNext = sounds.length > pageSize;
  return {
    results: hasNext ? sounds.slice(0, pageSize) : sounds,
    count: sounds.length,
    hasNext,
  };
}

// Page through the Kenney library. A query uses the description embedding, then text match.
export async function listSoundEffects(input: { page?: number; query?: string }) {
  const { page, pageSize, skip } = soundEffectPageBounds(input.page ?? 1);
  const query = input.query?.trim() ?? "";
  const listed = query
    ? await listByVector(query, skip, pageSize).catch(() => listByText(query, skip, pageSize))
    : await listByName(skip, pageSize);
  return { page, pageSize, ...listed };
}
