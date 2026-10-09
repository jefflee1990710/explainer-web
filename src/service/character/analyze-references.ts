import { generateText, Output } from "ai";
import { z } from "zod";
import { requireAppUser } from "@/service/auth";
import { loadDirectorImageParts } from "@/service/character/cast-prompt";
import { MAX_CHARACTER_REFERENCES } from "@/service/character/reference-urls";
import {
  coverageFromChecks,
  referencePhotoCheckSchema,
  type ReferenceCoverage,
} from "@/service/character/reference-coverage";
import { isExplainerBlobUrl } from "@/service/character/storage";
import { directorModel } from "@/service/director/model";

const SYSTEM = `You check reference photos uploaded for one character.
For every attached photo, in order, report what it shows. Be strict: a blueprint is drawn from these.
people: how many people are visible (0 when none).
faceVisible: true when the main person's face can be seen.
angle: front (looking at the camera), three-quarter (turned about 45 degrees), profile (side view), back, or unknown.
framing: closeup (head and shoulders or tighter), half (waist up), full (whole body including feet), or unknown.
sharp: false when the face is blurry, low resolution, or pixelated.
wellLit: false when the face is dark, backlit, or washed out.
occlusions: list anything that covers the face — sunglasses, mask, hat brim, hand, hair, heavy filter, cartoon sticker. Empty when nothing does.
Return one entry per photo with the matching 1-based index.`;

const outputSchema = z.object({ photos: z.array(referencePhotoCheckSchema) });

export type AnalyzeReferencesResult =
  | { ok: true; coverage: ReferenceCoverage }
  | { ok: false; error: string };

// Reads the uploaded photos and returns the coverage checklist for the create dialog.
// Only our own Blob URLs are fetched so the action cannot be pointed at other hosts.
export async function analyzeCharacterReferencesAction(
  urls: string[],
): Promise<AnalyzeReferencesResult> {
  try {
    await requireAppUser();
    const clean = [...new Set(urls.map((url) => String(url || "").trim()).filter(Boolean))].slice(
      0,
      MAX_CHARACTER_REFERENCES,
    );
    if (clean.length === 0) return { ok: false, error: "沒有可檢查的參考圖" };
    if (!clean.every(isExplainerBlobUrl)) return { ok: false, error: "參考圖來源無效" };

    const images = await loadDirectorImageParts(clean);
    const { output } = await generateText({
      model: directorModel(),
      output: Output.object({ schema: outputSchema }),
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `Photos attached: ${images.length}` }, ...images],
        },
      ],
    });
    // Keep one check per uploaded photo; fill any the model skipped as unknown.
    const byIndex = new Map(output.photos.map((photo) => [photo.index, photo]));
    const photos = clean.map(
      (_, i) =>
        byIndex.get(i + 1) ?? {
          index: i + 1,
          people: 1,
          faceVisible: false,
          angle: "unknown" as const,
          framing: "unknown" as const,
          sharp: true,
          wellLit: true,
          occlusions: [],
        },
    );
    return { ok: true, coverage: coverageFromChecks(photos) };
  } catch (error) {
    console.error("character reference analysis failed", error);
    return { ok: false, error: "參考圖檢查失敗" };
  }
}
