import { createHash } from "node:crypto";
import sharp from "sharp";
import type { CastMember } from "@/model/character";
import { charactersCollection } from "@/dao";
import { persistBuffer } from "@/service/higgsfield/persist";

// A multi-pose sheet loses to a single clothing photo. Outfit stills need one
// full-body portrait of the blueprint person so only the clothes can change.

const portraitUrlCache = new Map<string, Promise<string>>();

function cornerBackground(data: Buffer, width: number, height: number, channels: number) {
  const sample = 12;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  const origins = [
    [0, 0],
    [width - sample, 0],
    [0, height - sample],
    [width - sample, height - sample],
  ];
  for (const [originX, originY] of origins) {
    for (let y = originY; y < originY + sample; y += 1) {
      for (let x = originX; x < originX + sample; x += 1) {
        const index = (y * width + x) * channels;
        r += data[index];
        g += data[index + 1];
        b += data[index + 2];
        count += 1;
      }
    }
  }
  return [r / count, g / count, b / count];
}

// Drop the empty margin around a standing preview so the person fills the frame.
export async function cropFigureFromCanvas(buffer: Buffer) {
  const prepared = sharp(buffer).removeAlpha();
  const { data, info } = await prepared.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (width < 32 || height < 32 || channels < 3) return buffer;

  const background = cornerBackground(data, width, height, channels);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hits = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      const distance =
        Math.abs(data[index] - background[0]) +
        Math.abs(data[index + 1] - background[1]) +
        Math.abs(data[index + 2] - background[2]);
      if (distance <= 36) continue;
      hits += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (hits < 200) return buffer;
  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  // The subject already fills the photo. Cropping would only shave the edges.
  if (boxWidth > width * 0.62 && boxHeight > height * 0.62) return buffer;

  const padX = Math.round(boxWidth * 0.08);
  const padY = Math.round(boxHeight * 0.03);
  const left = Math.max(0, minX - padX);
  const top = Math.max(0, minY - padY);
  const right = Math.min(width, maxX + 1 + padX);
  const bottom = Math.min(height, maxY + 1 + padY);
  return sharp(buffer)
    .extract({ left, top, width: right - left, height: bottom - top })
    .png()
    .toBuffer();
}

// Front view is the first figure on the top row of a landscape blueprint sheet.
export async function cropBlueprintFront(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 64 || height < 64) return buffer;
  const left = Math.round(width * 0.05);
  const top = Math.round(height * 0.025);
  const cropWidth = Math.min(Math.round(width * 0.13), width - left);
  const cropHeight = Math.min(Math.round(height * 0.45), height - top);
  return sharp(buffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();
}

async function isPortrait(buffer: Buffer) {
  const meta = await sharp(buffer).metadata();
  return (meta.height ?? 0) > (meta.width ?? 1);
}

// Prefer the standing profile. A leftover wide sheet falls back to the front panel.
export async function outfitIdentityPortraitBuffer(input: {
  profile?: Buffer;
  blueprint: Buffer;
}) {
  if (input.profile) {
    const tight = await cropFigureFromCanvas(input.profile);
    if (await isPortrait(tight)) return tight;
  }
  const front = await cropBlueprintFront(input.blueprint);
  if (await isPortrait(front)) return front;
  return input.profile ? cropFigureFromCanvas(input.profile) : input.blueprint;
}

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法下載角色圖（${response.status}）`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadPortrait(member: CastMember) {
  const characters = await charactersCollection();
  const character = await characters.findOne({ _id: member.characterId });
  const version = character?.versions.find((item) => item.id.equals(member.versionId));
  const profileUrl = version?.profileUrl;
  const [blueprint, profile] = await Promise.all([
    download(member.blueprintUrl),
    profileUrl ? download(profileUrl) : Promise.resolve(undefined),
  ]);
  const portrait = await outfitIdentityPortraitBuffer({ profile, blueprint });
  const source = profileUrl || member.blueprintUrl;
  const hash = createHash("sha256").update(`outfit-identity-v1:${source}`).digest("hex").slice(0, 20);
  return persistBuffer(portrait, `explainer/outfit-identity/${hash}.png`, "image/png");
}

// Swap each blueprint sheet URL for that character's single full-body portrait.
export async function withOutfitIdentityPortraits(cast: CastMember[], refs: string[]) {
  const replacements = new Map<string, string>();
  await Promise.all(
    cast.map(async (member) => {
      if (!refs.includes(member.blueprintUrl) || replacements.has(member.blueprintUrl)) return;
      const key = `${String(member.characterId)}:${String(member.versionId)}:${member.blueprintUrl}`;
      let pending = portraitUrlCache.get(key);
      if (!pending) {
        pending = uploadPortrait(member).catch((error) => {
          portraitUrlCache.delete(key);
          throw error;
        });
        portraitUrlCache.set(key, pending);
      }
      replacements.set(member.blueprintUrl, await pending);
    }),
  );
  return refs.map((url) => replacements.get(url) ?? url);
}
