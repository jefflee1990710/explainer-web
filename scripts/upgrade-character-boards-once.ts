import { loadEnvConfig } from "@next/env";
import { charactersCollection } from "@/dao";
import { composeBlueprintBoard } from "@/service/character/blueprint-board";
import {
  BLUEPRINT_MODEL,
  sendCharacterFullBody,
  sendCharacterVersion,
} from "@/service/character/generate";
import {
  characterStyleIds,
  resolveVersionForStyle,
  versionStyleId,
} from "@/service/character/character-styles";
import { extractCharacterSpec } from "@/service/character/extract-spec";
import { rootReferenceUrls } from "@/service/character/reference-urls";
import { persistBuffer, persistMedia } from "@/service/higgsfield/persist";
import { fetchHiggsfieldStatus, mediaUrlFromResponse } from "@/service/higgsfield/generate";
import { loadRenderableStyle } from "@/service/style/renderable-style";
import type { Character, CharacterVersion } from "@/model/character";
import type { Sent } from "@/service/generation/sent";

loadEnvConfig(process.cwd());

const POLL_MS = 4000;
const TIMEOUT_MS = 8 * 60 * 1000;

type Target = { character: Character; version: CharacterVersion };

// The sheet each style currently casts. Boards are already upgraded.
function targets(characters: Character[]): Target[] {
  const rows: Target[] = [];
  for (const character of characters) {
    for (const styleId of characterStyleIds(character)) {
      const version = resolveVersionForStyle(character, styleId);
      if (!version?.blueprintUrl || version.status !== "completed") continue;
      if (version.blueprintKind === "board") continue;
      rows.push({ character, version });
    }
  }
  return rows;
}

async function waitForImage(sent: Sent) {
  const ready = mediaUrlFromResponse(sent);
  if (sent.status === "completed" && ready) return ready;
  if (sent.status === "failed" || sent.status === "nsfw") {
    throw new Error(sent.error || sent.status || "generation failed");
  }
  if (!sent.statusUrl) throw new Error("no status url");
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await fetchHiggsfieldStatus(sent.statusUrl);
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

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// Rebuild one live sheet as a board, in place. The old sheet URL is replaced;
// videos already cast keep their snapshot. No user credits are charged.
async function upgradeOne(row: Target) {
  const { character, version } = row;
  const photos = rootReferenceUrls(character.versions, version);
  const label = `${character.name} / ${versionStyleId(character, version)} / ${version.id.toHexString()}`;
  console.log(`upgrade ${label} (${photos.length} photos)…`);

  const spec =
    version.spec ??
    (await extractCharacterSpec({
      name: character.name,
      description: version.prompt,
      referenceImageUrls: photos,
    }));

  // A board version in memory: original photos only, no parent sheet in the refs.
  const boardVersion: CharacterVersion = {
    ...version,
    blueprintKind: "board",
    stage: "portrait",
    editInstruction: undefined,
    parentVersionId: undefined,
    referenceImageUrl: photos[0],
    referenceImageUrls: photos.length ? photos : undefined,
    portraitUrl: undefined,
    profileUrl: undefined,
    blueprintUrl: undefined,
    ...(spec ? { spec } : {}),
  };

  const portraitSent = await sendCharacterVersion(character, boardVersion);
  const portraitOutput = await waitForImage(portraitSent);
  const base = `explainer/characters/${character._id.toHexString()}/${version.id.toHexString()}`;
  const portraitUrl = await persistMedia(portraitOutput, `${base}-portrait`);

  const fullBodySent = await sendCharacterFullBody(character, { ...boardVersion, portraitUrl });
  const fullBodyOutput = await waitForImage(fullBodySent);

  let background: string | undefined;
  try {
    const style = await loadRenderableStyle({
      styleId: versionStyleId(character, version),
      ownerClerkUserId: character.clerkUserId,
    });
    background = style.canvasColor;
  } catch {
    background = undefined;
  }
  const [fullBodyBuffer, portraitBuffer] = await Promise.all([
    download(fullBodyOutput),
    download(portraitUrl),
  ]);
  const board = await composeBlueprintBoard({ portrait: portraitBuffer, fullBody: fullBodyBuffer, background });
  const [profileUrl, blueprintUrl] = await Promise.all([
    persistBuffer(fullBodyBuffer, `${base}-standing`, "image/png"),
    persistBuffer(board, `${base}-board`, "image/png"),
  ]);

  const characters = await charactersCollection();
  await characters.updateOne(
    { _id: character._id, "versions.id": version.id },
    {
      $set: {
        "versions.$.blueprintKind": "board",
        "versions.$.portraitUrl": portraitUrl,
        "versions.$.profileUrl": profileUrl,
        "versions.$.blueprintUrl": blueprintUrl,
        ...(spec ? { "versions.$.spec": spec } : {}),
        updatedAt: new Date(),
      },
      $unset: { "versions.$.stage": "", "versions.$.profileStatus": "" },
    },
  );
  console.log(`  ✓ ${blueprintUrl}`);
}

async function main() {
  const characters = await charactersCollection();
  const docs = (await characters.find({}).toArray()) as Character[];
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : Infinity;
  const rows = targets(docs).slice(0, Number.isFinite(limit) ? limit : undefined);
  console.log(`${rows.length} live sheets to upgrade (model ${BLUEPRINT_MODEL})`);
  if (process.argv.includes("--dry-run")) {
    for (const row of rows) {
      console.log(`  ${row.character.name} ${versionStyleId(row.character, row.version)} ${row.version.id.toHexString()}`);
    }
    process.exit(0);
  }
  let failed = 0;
  const queue = [...rows];
  const workers = Array.from({ length: Math.min(2, queue.length) }, async () => {
    while (queue.length > 0) {
      const row = queue.shift();
      if (!row) return;
      try {
        await upgradeOne(row);
      } catch (error) {
        failed += 1;
        console.error(`  ✗ ${row.character.name}:`, error instanceof Error ? error.message : error);
      }
    }
  });
  await Promise.all(workers);
  console.log(failed ? `done with ${failed} failures` : "done");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
