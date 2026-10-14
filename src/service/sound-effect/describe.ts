import { KENNEY_FAMILIES, KENNEY_PACK_TITLES } from "@/service/sound-effect/kenney-catalog";

const AUDIO_EXTENSIONS = new Set([".ogg", ".wav", ".mp3"]);

// Pack montage previews are not individual effects.
export function isKenneySoundFile(relativePath: string) {
  const base = relativePath.split("/").pop() ?? "";
  if (base.toLowerCase() === "preview.ogg") return false;
  const dot = base.lastIndexOf(".");
  if (dot < 0) return false;
  return AUDIO_EXTENSIONS.has(base.slice(dot).toLowerCase());
}

// `click_001` and `click5` both become family `click` plus the variant token.
export function parseKenneyStem(filename: string) {
  const base = filename.split("/").pop() ?? filename;
  const stem = base.replace(/\.[^.]+$/, "");
  const separated = stem.match(/^(.*?)[_-](\d+)$/);
  if (separated?.[1]) {
    return { family: separated[1], variant: separated[2] };
  }
  const digits = stem.match(/^(.*?)(\d+)$/);
  if (digits?.[1]) {
    return { family: digits[1], variant: digits[2] };
  }
  return { family: stem, variant: null as string | null };
}

export function describeKenneySound(pack: string, filename: string) {
  const { family, variant } = parseKenneyStem(filename);
  const entry = KENNEY_FAMILIES[`${pack}/${family}`];
  const packTitle = KENNEY_PACK_TITLES[pack];
  if (!entry || !packTitle) {
    throw new Error(`No use description for ${pack}/${family}`);
  }
  const variantLabel = variant == null ? "" : ` variant ${variant}`;
  const name = variant == null ? entry.label : `${entry.label} ${variant}`;
  const description = `${entry.label}${variantLabel}. ${entry.when} Kenney ${packTitle}, CC0.`;
  return { name, description, tags: entry.tags, family };
}
