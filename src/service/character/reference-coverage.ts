import { z } from "zod";

// What one uploaded photo shows, as judged by the vision model.
export const referencePhotoCheckSchema = z.object({
  // 1-based position in the upload list.
  index: z.number().int().min(1),
  // How many people are in the photo (0, 1, or more).
  people: z.number().int().min(0),
  faceVisible: z.boolean(),
  angle: z.enum(["front", "three-quarter", "profile", "back", "unknown"]),
  framing: z.enum(["closeup", "half", "full", "unknown"]),
  sharp: z.boolean(),
  wellLit: z.boolean(),
  // Things covering the face: sunglasses, mask, hat brim, hand, hair, heavy filter.
  occlusions: z.array(z.string().max(40)).max(6),
});

export type ReferencePhotoCheck = z.infer<typeof referencePhotoCheckSchema>;

// Face shots are enough. A full-body photo is not required.
export const COVERAGE_NEEDS = ["frontFace", "sideFace", "clearCloseup"] as const;
export type CoverageNeed = (typeof COVERAGE_NEEDS)[number];

export type CoverageWarningReason = "blurry" | "dark" | "occluded" | "multiplePeople" | "noFace";

export type ReferenceCoverage = {
  photos: ReferencePhotoCheck[];
  // Needs the current photos do not meet, in guideline order.
  missing: CoverageNeed[];
  // Per-photo problems worth a retake.
  warnings: Array<{ index: number; reason: CoverageWarningReason }>;
  // True when nothing is missing and no photo needs a retake.
  ok: boolean;
};

// A photo counts toward coverage only when it shows one clear face (or a full body).
function usable(photo: ReferencePhotoCheck) {
  return photo.people === 1 && photo.sharp && photo.occlusions.length === 0;
}

// Turn the per-photo checks into the checklist the upload dialog shows.
export function coverageFromChecks(photos: ReferencePhotoCheck[]): ReferenceCoverage {
  const good = photos.filter(usable);
  const frontFace = good.some(
    (photo) => photo.faceVisible && (photo.angle === "front" || photo.angle === "three-quarter"),
  );
  const sideFace = good.some(
    (photo) => photo.faceVisible && (photo.angle === "profile" || photo.angle === "three-quarter"),
  );
  const clearCloseup = good.some(
    (photo) => photo.faceVisible && photo.framing === "closeup" && photo.wellLit,
  );
  const have: Record<CoverageNeed, boolean> = { frontFace, sideFace, clearCloseup };
  const missing = COVERAGE_NEEDS.filter((need) => !have[need]);

  const warnings: ReferenceCoverage["warnings"] = [];
  for (const photo of photos) {
    if (photo.people === 0 || (!photo.faceVisible && photo.framing !== "full")) {
      warnings.push({ index: photo.index, reason: "noFace" });
      continue;
    }
    if (photo.people > 1) warnings.push({ index: photo.index, reason: "multiplePeople" });
    if (!photo.sharp) warnings.push({ index: photo.index, reason: "blurry" });
    if (!photo.wellLit) warnings.push({ index: photo.index, reason: "dark" });
    if (photo.occlusions.length) warnings.push({ index: photo.index, reason: "occluded" });
  }

  return { photos, missing, warnings, ok: missing.length === 0 && warnings.length === 0 };
}
