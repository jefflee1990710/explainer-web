import type { IDirectorBehavior } from "@/model/director";
import type { PerformanceSlots } from "@/model/director-performance";
import { PROFILE_KEYS, type DirectorProfile } from "@/model/director-profile";
import type { SkillReference } from "@/model/skill";
import { PROFILE_LABELS_EN } from "@/service/director/profile";

export const DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR: IDirectorBehavior = {
  keyframeMode: "start-only",
  chainsClipStarts: false,
  anchorsFramesToFirstClip: false,
  dualBeat: false,
  maxBackgroundSets: 4,
  speechMode: "narrator",
  bansNarration: false,
  requiredCastCount: 1,
  selfShotCreatorCamera: false,
  forcesSceneText: false,
  allowsInWorldLabels: false,
  attachesTextStyleReference: true,
  maxStyleCount: 1,
  requiresSpokenScript: false,
  allowsRoomBackgroundUpload: false,
  allowsOpeningPhotoUpload: false,
  allowsBrandLogoUpload: false,
  hiddenInPicker: false,
  audioFirstLipSync: false,
  wardrobeBuild: false,
};

export type CompileDirectorInput = {
  slug: string;
  title: string;
  description: string;
  suggestedUseCase?: string;
  behavior: IDirectorBehavior;
  profile: DirectorProfile;
  performance?: PerformanceSlots;
  extraInstructions?: string;
};

export function normalizeDirectorBehavior(
  partial?: Partial<IDirectorBehavior> | null,
  fallback: IDirectorBehavior = DEFAULT_CUSTOM_DIRECTOR_BEHAVIOR,
): IDirectorBehavior {
  const merged: IDirectorBehavior = {
    ...fallback,
    ...(partial ?? {}),
  };
  if (merged.speechMode === "lip-sync" || merged.speechMode === "silent") {
    merged.bansNarration = true;
  } else {
    merged.bansNarration = false;
    merged.audioFirstLipSync = false;
  }
  if (merged.audioFirstLipSync) {
    merged.talkingHeadShot = merged.talkingHeadShot ?? "face";
  }
  return merged;
}

// Deterministically compiles a standalone `systemPrompt` and Phase A / Phase B `references`
// from a director's structured fields so custom directors never depend on a hardcoded template at runtime.
export function compileDirectorPrompts(input: CompileDirectorInput): {
  systemPrompt: string;
  references: SkillReference[];
} {
  const b = normalizeDirectorBehavior(input.behavior);
  const title = input.title.trim() || "Custom Director";
  const desc = input.description.trim() || "Custom video director.";

  const speechRule =
    b.speechMode === "lip-sync"
      ? b.audioFirstLipSync
        ? "On-screen lip-sync (`speechMode: lip-sync`, `audioFirstLipSync: true`): the attached character speaks `englishVo` directly on camera. Audio is synthesized first and drives lip-sync up to 120s."
        : "On-screen lip-sync (`speechMode: lip-sync`): the attached character speaks `englishVo` on camera with natural, restrained lip articulation (or alternates A-roll on-camera speech with B-roll action where their voiceover continues off-screen)."
      : b.speechMode === "silent"
        ? "Silent visual showcase (`speechMode: silent`): `englishVo` MUST be \"(no dialogue)\" on every clip. The character's mouth stays softly closed at all times (zero lip-sync). Communicate through action, composition, and subtle Foley SFX."
        : "Off-screen narrator (`speechMode: narrator`): an unseen narrator speaks every `englishVo` line. On-screen characters keep their mouths closed (zero lip-sync) while reacting with expressive body language and facial expressions.";

  const keyframeRule =
    b.keyframeMode === "end-is-next-start"
      ? "Keyframe continuity (`end-is-next-start`): each clip lands on the next clip's start still; only the final clip draws its own end still."
      : b.dualBeat
        ? "Dual-beat clips (`dualBeat: true`): every clip defines `startScene` + `endScene` and `startVo` + `endVo`."
        : "Start-only keyframes (`start-only`): each clip defines its opening still and timed camera/subject motion in `motionCamera`.";

  const wardrobeRule = b.wardrobeBuild
    ? "Wardrobe lookbook lock (`wardrobeBuild: true`): keep the character's face, hair, and skin texture 100% locked to the character blueprint, while copying worn garments 100% from the attached clothing reference images (`referenceImageIds`)."
    : "";

  const profileSections = PROFILE_KEYS.filter((key) => input.profile[key]?.trim()).map(
    (key) => `### ${PROFILE_LABELS_EN[key]}\n${input.profile[key].trim()}`,
  );

  const perfLines =
    b.speechMode === "lip-sync" && input.performance
      ? Object.entries(input.performance)
          .filter(([, val]) => Boolean(val?.trim()))
          .map(([k, val]) => `- **${k}**: ${val.trim()}`)
      : [];

  const systemPrompt = [
    "---",
    `name: ${input.slug}`,
    `description: ${JSON.stringify(desc)}`,
    "---",
    "",
    `# ${title}`,
    "",
    desc,
    "",
    "## Core Pipeline & Behavior Contract",
    `- ${speechRule}`,
    `- ${keyframeRule}`,
    "- First 3-second Reel hook title: when on-canvas text is enabled, Clip 1's opening scene (`startScene` / `explainerScene`) and first 3 seconds (`0–3s` in `motionCamera`) MUST always feature a BIG, BOLD HOOK TITLE inside 「...」 in the user's configured on-screen text language (when on-canvas text is off, omit all written text).",
    `- Required cast count: ${b.requiredCastCount} character(s).`,
    `- Max background sets: ${b.maxBackgroundSets}.`,
    ...(b.chainsClipStarts
      ? ["- Clip continuity (`chainsClipStarts: true`): Clip 2+ continues from the previous clip's ending pose and framing."]
      : []),
    ...(b.anchorsFramesToFirstClip
      ? ["- Visual anchor (`anchorsFramesToFirstClip: true`): Clip 2+ locks room architecture and lighting to Clip 1's opening frame."]
      : []),
    ...(wardrobeRule ? [`- ${wardrobeRule}`] : []),
    "",
    ...(profileSections.length > 0
      ? ["## Director Profile & Storyboard Guide", "", ...profileSections, ""]
      : []),
    ...(perfLines.length > 0
      ? ["## On-Camera Performance Slots", "", ...perfLines, ""]
      : []),
    ...(input.extraInstructions?.trim()
      ? ["## Additional Director Instructions", "", input.extraInstructions.trim(), ""]
      : []),
    "## Workflow",
    "1. Read `references/proposal-contract.md` and produce Phase A.",
    "2. After approval, read `references/prompt-contract.md` and produce Phase B.",
  ].join("\n");

  const proposalRef = [
    `# ${title} — Proposal Contract (Phase A)`,
    "",
    `1. Follow the core behavior: ${speechRule}`,
    `2. Keyframe structure: ${keyframeRule}`,
    ...(input.profile.structure?.trim() ? [`3. Structure & pacing: ${input.profile.structure.trim()}`] : []),
    ...(input.profile.hook?.trim() ? [`4. Opening hook: ${input.profile.hook.trim()}`] : []),
    ...(input.profile.arc?.trim() ? [`5. Narrative arc: ${input.profile.arc.trim()}`] : []),
    ...(input.profile.visual?.trim() ? [`6. Visual world: ${input.profile.visual.trim()}`] : []),
    ...(input.profile.rules?.trim() ? [`7. Key rules: ${input.profile.rules.trim()}`] : []),
    ...(input.extraInstructions?.trim() ? ["", "## Extra Instructions", input.extraInstructions.trim()] : []),
  ].join("\n");

  const promptRef = [
    `# ${title} — Clip Prompt Contract (Phase B)`,
    "",
    "Write one video prompt per approved clip.",
    `1. ${speechRule}`,
    `2. ${keyframeRule}`,
    ...(input.profile.visual?.trim() ? [`3. Visual & camera rules: ${input.profile.visual.trim()}`] : []),
    ...(input.profile.audio?.trim() ? [`4. Audio & SFX rules: ${input.profile.audio.trim()}`] : []),
    ...(input.extraInstructions?.trim() ? ["", "## Extra Instructions", input.extraInstructions.trim()] : []),
  ].join("\n");

  return {
    systemPrompt,
    references: [
      { path: "references/proposal-contract.md", content: proposalRef },
      { path: "references/prompt-contract.md", content: promptRef },
    ],
  };
}
