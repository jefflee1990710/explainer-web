import type { ObjectId } from "mongodb";

// Atlas vector index over `descriptionEmbedding`. Created by the Kenney seed script.
export const SOUND_EFFECT_VECTOR_INDEX = "sound_effect_description";

export const SOUND_EFFECT_EMBEDDING_MODEL = "gemini-embedding-001";

export const SOUND_EFFECT_EMBEDDING_DIMENSIONS = 768;

// One reusable sound effect. `description` says when to use it and is what we embed.
export type SoundEffectDoc = {
  _id: ObjectId;
  source: "kenney";
  sourceId: string;
  pack: string;
  name: string;
  filename: string;
  blobPath: string;
  blobUrl: string;
  contentType: string;
  bytes: number;
  durationSec: number | null;
  license: "CC0-1.0";
  licenseUrl: string;
  credit: string;
  description: string;
  tags: string[];
  descriptionEmbedding: number[];
  embeddingModel: typeof SOUND_EFFECT_EMBEDDING_MODEL;
  embeddingDimensions: typeof SOUND_EFFECT_EMBEDDING_DIMENSIONS;
  createdAt: Date;
  updatedAt: Date;
};
