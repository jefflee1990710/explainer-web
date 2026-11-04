import type { AspectRatio } from "@/model/project";

export function teleportTaskTitle(scenePrompt?: string): string {
  const line = (scenePrompt ?? "").split(/\r?\n/)[0]?.trim() ?? "";
  if (!line) return "Teleport";
  return [...line].slice(0, 40).join("");
}

export function chooseTeleportVideoEngine(input: {
  hasMannequin: boolean;
  hasMinimaxKey: boolean;
}): "h3" | "hailuo" {
  return input.hasMannequin && input.hasMinimaxKey ? "h3" : "hailuo";
}

export function buildTeleportScenePlatePrompt(
  scenePrompt: string,
  aspectRatio: AspectRatio = "9:16",
): string {
  return `Create a photoreal ${aspectRatio} scene still with no people, no faces, no bodies, and no mannequins. Location: ${scenePrompt.trim()}. The frame is empty of humans. Natural perspective and lighting.`;
}

export function buildTeleportRelocatePrompt(input: {
  moment: "start" | "end";
  scenePrompt?: string;
}): string {
  const mood = input.scenePrompt?.trim()
    ? `Apply this change to the place: ${input.scenePrompt.trim()}.`
    : "";
  return [
    "Attached image 1 is the person to keep. Attached image 2 is the place they must enter.",
    "Keep this exact person's face, body, outfit, expression, and the action of this instant.",
    "Place them inside attached image 2. Position, scale, and lighting may change so they belong in that place.",
    "Do not invent a different location. Do not keep the old background from attached image 1.",
    `This is the ${input.moment} moment.`,
    mood,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildTeleportVideoPrompt(input: {
  engine: "h3" | "hailuo";
  motionText: string;
  scenePrompt?: string;
  identityIgnoresBackground: boolean;
  hasReferenceAudio?: boolean;
}): string {
  const mood = input.scenePrompt?.trim() ? input.scenePrompt.trim() : "";
  if (input.engine === "hailuo") {
    return [
      "[Shot 1] The shot begins from the attached first frame and transitions smoothly to the attached last frame.",
      "Keep the same person, outfit, and the new scene. Do not return to the original location.",
      input.motionText,
      mood,
    ]
      .filter(Boolean)
      .join(" ");
  }
  // Background swap: the person stays visible in the motion guide; the old place is a grey blur (`flip_input`).
  const subjects = [
    "subject_definitions:",
    "Reference image 1 is the person already standing in the new scene. Keep that environment.",
    "Reference image 2 is the identity lock: keep that face, body, and outfit.",
  ];
  if (input.identityIgnoresBackground) {
    subjects.push("Ignore the background of reference image 2.");
  }
  subjects.push(
    "Reference video 1 is the source footage in which the setting around the person is a smooth grey blur that supplies only the camera movement and rough layout. The person stays visible and supplies the exact head angle, gaze, facial expression, mouth opening, pose, hands, and timing.",
  );
  if (input.hasReferenceAudio) {
    subjects.push(
      "Reference audio 1 is the spoken voice. Synchronize the person's lip and mouth movements accurately word-for-word with Reference audio 1, and keep the mouth naturally relaxed when silent.",
    );
  }
  return [
    ...subjects,
    "",
    "summary:",
    "[video editing + reference generation + audio reuse] The person keeps their exact look and performance, while the setting around them becomes the scene in Reference image 1. Do not hold the reference picture's starting pose as the guide moves. No part of the original location remains.",
    "",
    "detailed_description:",
    input.motionText.trim(),
    ...(mood ? [mood] : []),
    "Follow the visible person's poses at the corresponding moments, through the last frame. The grey background is not a place to copy.",
    "",
    "overall_soundscape:",
    input.hasReferenceAudio
      ? "Reuse Reference audio 1 unchanged. Add no new voices, music or sound effects."
      : "Keep the performance's sound coherent. Add no unrelated voices or music.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}
