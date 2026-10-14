import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { google } from "@ai-sdk/google";
import { put } from "@vercel/blob";
import { loadEnvConfig } from "@next/env";
import { embedMany } from "ai";
import { getDb } from "@/dao/mongo";
import { soundEffectsCollection } from "@/dao/sound-effects";
import {
  SOUND_EFFECT_EMBEDDING_DIMENSIONS,
  SOUND_EFFECT_EMBEDDING_MODEL,
  SOUND_EFFECT_VECTOR_INDEX,
  type SoundEffectDoc,
} from "@/model/sound-effect";
import { describeKenneySound, isKenneySoundFile } from "@/service/sound-effect/describe";

loadEnvConfig(process.cwd());

const execFileAsync = promisify(execFile);

// Official Kenney asset pages. The zip link is the CC0 download, not the donate button.
const PACKS = [
  "interface-sounds",
  "ui-audio",
  "impact-sounds",
  "sci-fi-sounds",
  "digital-audio",
  "rpg-audio",
  "casino-audio",
] as const;

const CREDIT = "Kenney (www.kenney.nl)";
const LICENSE_URL = "https://creativecommons.org/publicdomain/zero/1.0/";

type PreparedSound = {
  pack: string;
  filename: string;
  filePath: string;
  sourceId: string;
  blobPath: string;
  name: string;
  description: string;
  tags: string[];
  bytes: number;
  durationSec: number | null;
  contentType: string;
};

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function kenneyZipUrl(slug: string) {
  const response = await fetch(`https://kenney.nl/assets/${slug}`, {
    headers: { "user-agent": "explainer-web sound-effect seed" },
  });
  if (!response.ok) throw new Error(`Kenney page ${slug} returned ${response.status}`);
  const html = await response.text();
  if (!html.includes("CC0")) throw new Error(`${slug} page is not marked CC0`);
  const match = html.match(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"']+\.zip/);
  if (!match) throw new Error(`No zip link on ${slug}`);
  return match[0];
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(full)));
    else files.push(full);
  }
  return files;
}

function contentTypeFor(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".mp3") return "audio/mpeg";
  throw new Error(`Unsupported audio ${filename}`);
}

async function durationSec(filePath: string) {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      filePath,
    ]);
    const value = Number(stdout.trim());
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

async function embedDescriptions(values: string[]) {
  const model = google.embeddingModel(SOUND_EFFECT_EMBEDDING_MODEL);
  const embeddings: number[][] = [];
  const size = 64;
  for (let offset = 0; offset < values.length; offset += size) {
    const slice = values.slice(offset, offset + size);
    const result = await embedMany({
      model,
      values: slice,
      maxParallelCalls: 1,
      providerOptions: {
        google: {
          outputDimensionality: SOUND_EFFECT_EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    });
    for (const embedding of result.embeddings) {
      if (embedding.length !== SOUND_EFFECT_EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected ${SOUND_EFFECT_EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`);
      }
    }
    embeddings.push(...result.embeddings);
    console.log(`embedded ${embeddings.length}/${values.length}`);
  }
  return embeddings;
}

async function ensureVectorIndex() {
  const db = await getDb();
  try {
    await db.command({
      createSearchIndexes: "soundEffects",
      indexes: [
        {
          name: SOUND_EFFECT_VECTOR_INDEX,
          type: "vectorSearch",
          definition: {
            fields: [
              {
                type: "vector",
                path: "descriptionEmbedding",
                numDimensions: SOUND_EFFECT_EMBEDDING_DIMENSIONS,
                similarity: "cosine",
              },
              { type: "filter", path: "source" },
              { type: "filter", path: "pack" },
              { type: "filter", path: "tags" },
            ],
          },
        },
      ],
    });
    console.log(`vector index ${SOUND_EFFECT_VECTOR_INDEX} created`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/already exists/i.test(message)) {
      console.log(`vector index ${SOUND_EFFECT_VECTOR_INDEX} already exists`);
      return;
    }
    console.warn(`vector index was not created: ${message}`);
  }
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("尚未設定 BLOB_READ_WRITE_TOKEN，無法保存音效");
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("尚未設定 GOOGLE_GENERATIVE_AI_API_KEY，無法建立 embedding");
  }

  const work = await mkdtemp(path.join(tmpdir(), "kenney-sfx-"));
  try {
    const prepared: PreparedSound[] = [];
    for (const pack of PACKS) {
      const zipUrl = await kenneyZipUrl(pack);
      console.log(`download ${pack}`);
      const response = await fetch(zipUrl);
      if (!response.ok) throw new Error(`${pack} zip returned ${response.status}`);
      const zipPath = path.join(work, `${pack}.zip`);
      await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
      const dest = path.join(work, pack);
      await execFileAsync("unzip", ["-o", "-q", zipPath, "-d", dest]);

      const licensePath = (await walkFiles(dest)).find((file) => path.basename(file) === "License.txt");
      if (!licensePath) throw new Error(`${pack} has no License.txt`);
      const license = await readFile(licensePath, "utf8");
      if (!/CC0|Creative Commons Zero/i.test(license)) {
        throw new Error(`${pack} license is not CC0`);
      }

      const audioFiles = (await walkFiles(dest)).filter((file) =>
        isKenneySoundFile(path.relative(dest, file)),
      );
      const described = await mapPool(audioFiles, 8, async (filePath) => {
        const filename = path.basename(filePath);
        const use = describeKenneySound(pack, filename);
        const data = await readFile(filePath);
        return {
          pack,
          filename,
          filePath,
          sourceId: `kenney/${pack}/${filename}`,
          blobPath: `sound-effects/kenney/${pack}/${filename}`,
          name: use.name,
          description: use.description,
          tags: use.tags,
          bytes: data.length,
          durationSec: await durationSec(filePath),
          contentType: contentTypeFor(filename),
        } satisfies PreparedSound;
      });
      prepared.push(...described);
      console.log(`  ${described.length} sounds`);
    }

    console.log(`embedding ${prepared.length} descriptions`);
    const embeddings = await embedDescriptions(prepared.map((sound) => sound.description));

    console.log(`uploading ${prepared.length} files`);
    const uploaded = await mapPool(prepared, 4, async (sound, index) => {
      const body = await readFile(sound.filePath);
      const blob = await put(sound.blobPath, body, {
        access: "public",
        contentType: sound.contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      if ((index + 1) % 25 === 0 || index + 1 === prepared.length) {
        console.log(`  uploaded ${index + 1}/${prepared.length}`);
      }
      return blob.url;
    });

    const now = new Date();
    const collection = await soundEffectsCollection();
    await collection.createIndex({ sourceId: 1 }, { unique: true });
    const operations = prepared.map((sound, index) => {
      const set: Omit<SoundEffectDoc, "_id" | "createdAt"> = {
        source: "kenney",
        sourceId: sound.sourceId,
        pack: sound.pack,
        name: sound.name,
        filename: sound.filename,
        blobPath: sound.blobPath,
        blobUrl: uploaded[index],
        contentType: sound.contentType,
        bytes: sound.bytes,
        durationSec: sound.durationSec,
        license: "CC0-1.0",
        licenseUrl: LICENSE_URL,
        credit: CREDIT,
        description: sound.description,
        tags: sound.tags,
        descriptionEmbedding: embeddings[index],
        embeddingModel: SOUND_EFFECT_EMBEDDING_MODEL,
        embeddingDimensions: SOUND_EFFECT_EMBEDDING_DIMENSIONS,
        updatedAt: now,
      };
      return {
        updateOne: {
          filter: { sourceId: sound.sourceId },
          update: { $set: set, $setOnInsert: { createdAt: now } },
          upsert: true,
        },
      };
    });
    for (let offset = 0; offset < operations.length; offset += 100) {
      await collection.bulkWrite(operations.slice(offset, offset + 100));
    }
    await ensureVectorIndex();

    const count = await collection.countDocuments({ source: "kenney" });
    console.log(`indexed ${count} kenney sound effects`);
  } finally {
    // Some zips include a read-only desktop.ini. Cleanup must not fail the seed.
    try {
      await execFileAsync("chmod", ["-R", "u+w", work]);
      await rm(work, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `temp cleanup skipped: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
