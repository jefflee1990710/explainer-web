import type { TextStyleDoc } from "@/model/text-style";
import { subtitleLookLine } from "@/service/director/subtitle-look";
import type { SubtitleLook } from "@/model/subtitle-look-id";

export const LOOK_LINE_MAX = 2000;

// Uploaded samples with no lookLine yet: chat can refine this into a full description.
export const DEFAULT_UPLOAD_LOOK_LINE =
  "Look: match the current lettering sample's weight, color, texture, and edges. Not a scene, not people, and not placement.";

export function lookLineFromSystemLook(look: SubtitleLook) {
  return subtitleLookLine(look);
}

// Prefer the saved lookLine; fall back so older upload-only rows stay editable.
export function resolveTextStyleLookLine(doc: Pick<TextStyleDoc, "lookLine">) {
  const line = doc.lookLine?.trim();
  return line || DEFAULT_UPLOAD_LOOK_LINE;
}

export function parseLookLine(raw: unknown): { ok: true; lookLine: string } | { ok: false; error: string } {
  const lookLine = String(raw ?? "").trim();
  if (!lookLine) return { ok: false, error: "請輸入字體描述" };
  if (lookLine.length > LOOK_LINE_MAX) return { ok: false, error: `字體描述最多 ${LOOK_LINE_MAX} 字` };
  return { ok: true, lookLine };
}
