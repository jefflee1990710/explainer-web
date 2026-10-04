import { stylesCollection } from "@/dao";
import { CHALKBOARD_COLOR_FIELDS, CHALKBOARD_COLOR_ID, chalkboardColorDoc } from "@/service/style/chalkboard-color";

const PROMPT_KEYS = [
  "name",
  "description",
  "canvas",
  "canvasColor",
  "look",
  "palette",
  "typography",
  "motion",
  "negatives",
] as const;

function hasPromptFields(doc: Record<string, unknown> | null): boolean {
  if (!doc) return false;
  return PROMPT_KEYS.every((key) => typeof doc[key] === "string" && String(doc[key]).trim());
}

// Insert the colourful chalkboard catalog row when Mongo does not have it yet.
export async function ensureCatalogStyles() {
  const styles = await stylesCollection();
  const existing = await styles.findOne({ _id: CHALKBOARD_COLOR_ID });
  if (hasPromptFields(existing)) return;
  const chalkboard = await styles.findOne({ _id: "chalkboard" });
  const next = chalkboardColorDoc(chalkboard);
  await styles.updateOne(
    { _id: CHALKBOARD_COLOR_ID },
    {
      $set: {
        ...CHALKBOARD_COLOR_FIELDS,
        letteringLayout: next.letteringLayout,
        letteringLine1: next.letteringLine1,
        letteringLine2: next.letteringLine2,
        beatTitleLayout: next.beatTitleLayout,
        reelLayout: next.reelLayout,
        updatedAt: next.updatedAt,
        ...(existing?.previewUrl ? {} : { previewUrl: next.previewUrl, previewFullUrl: next.previewFullUrl }),
      },
    },
    { upsert: true },
  );
}
