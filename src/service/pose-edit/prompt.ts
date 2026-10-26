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
  poseText?: string;
  outfitText?: string;
  wardrobePrompts: Partial<Record<PoseEditPart, string>>;
  coversLegs: boolean;
}) {
  const lines = [
    "Edit the exact same person from the first image.",
    "STRICT FACE & IDENTITY LOCK (HIGHEST PRIORITY): The first image is the sole identity reference. Preserve 100% of this exact person's face, facial bone structure, eye shape, eyelids, gaze, nose bridge, lips, eyebrows, skin tone, facial marks, age, hairstyle, hair color, hairline, parting, and body proportions. Never replace, beautify, average, or alter their face into a different person, and never change their hair or ethnicity.",
    "Keep the exact background, environment, camera lens feel, and lighting from the first image. If the pose changes, framing may adjust naturally while keeping the person's exact face and head proportions identical to the first image. Keep every garment that is not listed below exactly as in the first photo. Do not draw skeleton lines, dots, or a stick figure.",
  ];
  const poseText = input.poseText?.trim();
  if (input.posePrompt && poseText) {
    lines.push(
      `The second image is a stick-figure pose skeleton guide only (white circle = head, colored lines = limbs). Match that body pose while keeping the exact face, head shape, and hairstyle from the first image. Pose: ${input.posePrompt} Additional pose direction: ${poseText}`,
    );
  } else if (input.posePrompt) {
    lines.push(
      `The second image is a stick-figure pose skeleton guide only (white circle = head, colored lines = limbs). Match that body pose while keeping the exact face, head shape, and hairstyle from the first image. Pose: ${input.posePrompt}`,
    );
  } else if (poseText) {
    lines.push(
      `Change their body pose to: ${poseText} (keep the exact same face, facial features, and hairstyle from the first image).`,
    );
  }
  for (const part of ["top", "pants", "shoes", "accessory"] as const) {
    const text = input.wardrobePrompts[part];
    if (text) lines.push(`${PART_LINE[part]}: ${text}`);
  }
  const outfitText = input.outfitText?.trim();
  if (outfitText) {
    lines.push(`Outfit description: ${outfitText}`);
  }
  if (input.coversLegs) lines.push("This top covers the legs. Do not add separate pants.");
  lines.push(
    "Final check: the output face must be unmistakably the exact same individual as in the first reference image.",
  );
  return lines.join("\n");
}
