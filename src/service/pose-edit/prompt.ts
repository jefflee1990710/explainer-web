import type { PoseEditPart } from "@/service/pose-edit/selection";

const PART_LINE: Record<PoseEditPart, string> = {
  top: "Change only the top to",
  pants: "Change only the pants to",
  shoes: "Change only the shoes to",
  accessory: "Change only the accessory to",
};

export function poseEditReferenceUrls(input: { sourceUrl: string; poseReferenceUrl?: string }) {
  return input.poseReferenceUrl ? [input.sourceUrl, input.poseReferenceUrl] : [input.sourceUrl];
}

export function poseEditPrompt(input: {
  posePrompt?: string;
  wardrobePrompts: Partial<Record<PoseEditPart, string>>;
  coversLegs: boolean;
}) {
  const lines = [
    "Edit the person in the first image. Keep their face, identity, body, background, and lighting. If the pose changes, framing may follow the new pose. Keep every garment that is not listed below exactly as in the photo. Do not draw skeleton lines, dots, or a stick figure.",
  ];
  if (input.posePrompt) {
    lines.push(`The second image is a pose skeleton. Match that body pose. Pose: ${input.posePrompt}`);
  }
  for (const part of ["top", "pants", "shoes", "accessory"] as const) {
    const text = input.wardrobePrompts[part];
    if (text) lines.push(`${PART_LINE[part]}: ${text}`);
  }
  if (input.coversLegs) lines.push("This top covers the legs. Do not add separate pants.");
  return lines.join("\n");
}
