import { loadEnvConfig } from "@next/env";
import { charactersCollection } from "@/dao";
import { BLUEPRINT_MODEL, sendCharacterProfile } from "@/service/character/generate";
import { persistMedia } from "@/service/higgsfield/persist";
import {
  fetchHiggsfieldStatus,
  mediaUrlFromResponse,
} from "@/service/higgsfield/generate";
import type { Character, CharacterVersion } from "@/model/character";

loadEnvConfig(process.cwd());

const POLL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000;

type Missing = { character: Character; version: CharacterVersion };

function missingProfiles(characters: Character[]): Missing[] {
  const rows: Missing[] = [];
  for (const character of characters) {
    for (const version of character.versions) {
      const force = process.argv.includes("--force");
      if (version.status === "completed" && version.blueprintUrl && (force || !version.profileUrl)) {
        rows.push({ character, version });
      }
    }
  }
  return rows;
}

async function waitForImage(submitted: {
  status?: string;
  status_url?: string;
  images?: Array<{ url: string }>;
}) {
  const ready = mediaUrlFromResponse(submitted);
  if (submitted.status === "completed" && ready) return ready;
  if (!submitted.status_url) throw new Error("no status url");

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await fetchHiggsfieldStatus(submitted.status_url);
    if (status.status === "completed") {
      const url = mediaUrlFromResponse(status);
      if (!url) throw new Error("completed without image");
      return url;
    }
    if (status.status === "failed" || status.status === "nsfw") {
      throw new Error(`generation ${status.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  throw new Error("timed out");
}

async function fillOne(row: Missing) {
  const { character, version } = row;
  const label = `${character.name} ${version.id.toHexString()}`;
  console.log(`generate ${label}…`);
  const submitted = await sendCharacterProfile(character, version, { webhook: false });
  if (submitted.status === "failed" || submitted.status === "nsfw") {
    throw new Error(submitted.error || submitted.status);
  }
  const outputUrl = await waitForImage({
    status: submitted.status,
    status_url: submitted.statusUrl,
    images: submitted.images,
  });
  const profileUrl = await persistMedia(
    outputUrl,
    `explainer/characters/${character._id.toHexString()}/${version.id.toHexString()}-standing`,
  );
  const characters = await charactersCollection();
  await characters.updateOne(
    { _id: character._id, "versions.id": version.id },
    {
      $set: { "versions.$.profileUrl": profileUrl, updatedAt: new Date() },
      $unset: { "versions.$.profileStatus": "" },
    },
  );
  console.log(`  ✓ ${profileUrl}`);
}

async function main() {
  const characters = await charactersCollection();
  const docs = (await characters.find({}).toArray()) as Character[];
  const rows = missingProfiles(docs);
  console.log(`${rows.length} portraits missing (model ${BLUEPRINT_MODEL})`);
  if (process.argv.includes("--dry-run")) {
    for (const row of rows) {
      console.log(`  ${row.character.name} ${row.version.id.toHexString()}`);
    }
    process.exit(0);
  }
  let failed = 0;
  const queue = [...rows];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) return;
      try {
        await fillOne(row);
      } catch (error) {
        failed += 1;
        console.error(`  ✗ ${row.character.name}:`, error instanceof Error ? error.message : error);
      }
    }
  });
  await Promise.all(workers);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
