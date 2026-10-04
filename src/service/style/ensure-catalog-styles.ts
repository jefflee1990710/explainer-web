import { stylesCollection } from "@/dao";
import { CHALKBOARD_COLOR_FIELDS, CHALKBOARD_COLOR_ID, chalkboardColorDoc } from "@/service/style/chalkboard-color";
import { CATALOG_EXTRA_STYLES } from "@/service/style/catalog-styles";

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

// Insert catalog rows that are not in the original seed when Mongo has no complete doc.
export async function ensureCatalogStyles() {
  const styles = await stylesCollection();
  const colorExisting = await styles.findOne({ _id: CHALKBOARD_COLOR_ID });
  if (!hasPromptFields(colorExisting)) {
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
          ...(colorExisting?.previewUrl ? {} : { previewUrl: next.previewUrl, previewFullUrl: next.previewFullUrl }),
        },
      },
      { upsert: true },
    );
  }
  for (const spec of CATALOG_EXTRA_STYLES) {
    const existing = await styles.findOne({ _id: spec.id });
    if (hasPromptFields(existing)) continue;
    await styles.updateOne(
      { _id: spec.id },
      { $set: { ...spec.fields, updatedAt: new Date() } },
      { upsert: true },
    );
  }
}
