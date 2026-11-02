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

export function buildTeleportScenePlatePrompt(scenePrompt: string): string {
  return `Create a photoreal 9:16 scene still with no people, no faces, no bodies, and no mannequins. Location: ${scenePrompt.trim()}. The frame is empty of humans. Natural perspective and lighting.`;
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
  return [
    "Reference image 1 is the person already standing in the new scene. Keep that environment.",
    "Reference image 2 is the identity lock: keep that face, body, and outfit.",
    input.identityIgnoresBackground
      ? "Ignore the background of reference image 2."
      : "",
    "Reference video 1 is a grey mannequin. Follow its pose, hands, and timing.",
    input.motionText,
    mood,
  ]
    .filter(Boolean)
    .join(" ");
}
