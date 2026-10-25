import type { IDirector } from "@/model/director";

const raw = {
  slug: "style-switch-director",
  title: "Multi-style character showcase",
  description:
    "Showcases one locked character jumping across up to 4 selected visual styles — opening with a creator hook in Style #1 and hard-cutting across contrasting art worlds while keeping face, hair, and outfit 100% consistent.",
  suggestedUseCase:
    "Character consistency demos, multi-universe brand campaigns, creative studio showcases, AI animation reels, and dimension-hopping social hooks.",
  sortOrder: 18,
  isActive: true,
  previewUrl:
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/style-switch-director-preview-e91f3bd4ee.webp",
  inputSchema: {
    requiresSource: true,
    aspectRatios: ["16:9", "9:16", "1:1"],
    durationPresets: ["micro", "short", "punchy", "full"],
    optionalCharacterImage: true,
  },
  higgsfieldDefaults: {
    imageModel: "alibaba/qwen-image-3/text-to-image",
    imageQuality: "medium",
    imageResolution: "1k",
    videoModel: "minimax/h3/image-to-video",
  },
  systemPrompt: `---
name: directing-style-switch-videos
description: Use when showcasing one locked character across multiple visual styles (up to 4 chosen styles), hard-cutting from a creator hook into contrasting visual worlds while preserving 100% character identity, hair, and wardrobe continuity.
---

# Directing Multi-Style Character Showcase Videos

## Core contract

Turn one brief into a confirmed director's proposal (Phase A) and standalone clip prompts (Phase B). The user selects between 1 and 4 visual styles (\`styleIds\`). Each clip is assigned one specific \`styleId\` from the user's selected styles so the video hard-cuts across different visual worlds while keeping the character's identity (face, hair, glasses/accessories, and core outfit silhouette/colors) 100% locked to the attached character blueprint.

## Multi-style assignment rules (\`styleId\` per clip)

- You will receive an ordered list of selected visual styles (\`styleIds\`).
- Every clip row in Phase A MUST set \`styleId\` to one of the provided style IDs.
- **Clip 1 (Anchor Hook)**: Use the first selected style (\`styleIds[0]\`). Open with a direct, high-energy creator hook or bold pain-point statement — e.g., a close-up / medium-close talking-head or expressive reaction where the character challenges the viewer ("Still regenerating the same character from scratch?").
- **Middle Clips (Cross-Style Dimension Jumps)**: Cycle through the remaining selected styles (\`styleIds[1]\`, \`styleIds[2]\`, \`styleIds[3]\`) across successive clips. On every cut, the rendering medium and environment transform completely to match that clip's assigned style, while the character's face, hairstyle, glasses, and outfit design remain unmistakably identical to the blueprint.
- **Final Clip (Payoff & Brand Outro)**: Land the punchline in the final style (or return to \`styleIds[0]\`) and settle onto a clean resting payoff or brand sign-off card.

## Cross-style character lock

- **100% Identity Continuity**: Across every style switch, the character keeps the exact same facial structure, hairstyle, eyewear/accessories, and outfit cut/colors from the attached blueprint. Never invent a replacement character or alter their wardrobe when switching styles.
- **Environment & Action**: Each clip stages a dynamic pose and environment that shows off that clip's assigned visual style at its best while advancing the spoken narrative.

## Voice & audio

- Spoken voiceover (\`englishVo\`) drives the narrative across the style cuts with punchy, fast-paced lines (~2.5 words/s).
- Audio uses crisp transition SFX (dimensional whoosh, snap cut, pop) on every style switch; no background music.

## Workflow

1. Read \`references/style-switch-proposal-contract.md\` and produce Phase A with an explicit \`styleId\` on every clip row.
2. Stop after Phase A and wait for approval.
3. Only after approval, read \`references/style-switch-prompt-contract.md\` and produce Phase B clip prompts.
`,
  references: [
    {
      path: "references/style-switch-proposal-contract.md",
      content: `# Multi-Style Character Showcase Proposal Contract (Phase A)

Use for Phase A. Stop for confirmation before model prompts.

## Per-clip \`styleId\` assignment

- Every row in \`clips\` MUST include \`styleId\` set to one of the user's selected style IDs.
- Distribute the selected styles across the clips in order so every chosen style is featured clearly:
  - Clip 1 uses Style #1 (\`styleIds[0]\`) for the opening hook.
  - Subsequent clips step through Style #2, Style #3, Style #4 (cycling if there are more clips than styles).
- In \`narrativeJob\`, name both the story role and the active style switch (e.g., \`Hook (Style 1)\`, \`Style Switch #2 — Action beat\`, \`Payoff & Outro\`).
- In \`startScene\` and \`endScene\`, describe the character's pose, expression, environment, lighting, and camera without contradicting the clip's assigned visual style. Keep face, hair, and outfit locked to the blueprint.
`,
    },
    {
      path: "references/style-switch-prompt-contract.md",
      content: `# Multi-Style Character Showcase Prompt Contract (Phase B)

Write one video prompt per approved clip:
1. Follow the clip's assigned visual style for all rendering, surface texture, and lighting.
2. Keep the character's facial features, hair, and wardrobe identical to the attached start/end keyframes.
3. Execute the camera move and character action cleanly over the clip duration.
4. Include crisp style-switch SFX from \`bgmSfx\`; no background music.
`,
    },
  ],
  profile: {
    bestFor:
      "Character consistency showcases, AI workflow demos, creative brand reels, and dimension-hopping promos where one character jumps across up to 4 visual styles.",
    structure:
      "5–8s clips. Clip 1 hooks in Style #1; middle clips hard-cut across Styles #2–#4; the final clip lands the payoff and brand sign-off.",
    hook: "Opens in Style #1 with an expressive creator hook or bold question before hard-cutting into a completely different art style on Clip 2.",
    arc: "Style #1 Hook → Style #2 World Jump → Style #3 World Jump → Style #4 Climax & Brand Outro.",
    narrator:
      "Punchy spoken lines carry continuously across the style switches while the character's identity stays locked.",
    visual:
      "Select up to 4 visual styles. Each clip renders in its assigned style while locking the character's face, hair, and outfit to the blueprint.",
    audio: "Dimensional whooshes, camera shutter snaps, and pop SFX on every style cut. No background music.",
    rules:
      "Requires 1 character blueprint and 1–4 selected visual styles. Every clip is tagged with its own styleId and renders in that style.",
  },
  behavior: {
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
    allowsInWorldLabels: true,
    attachesTextStyleReference: false,
    requiresSpokenScript: false,
    allowsRoomBackgroundUpload: false,
    allowsOpeningPhotoUpload: false,
    allowsBrandLogoUpload: true,
    maxStyleCount: 4,
    hiddenInPicker: false,
  },
} as const;

// Hardcoded director definition for "style-switch-director".
export const styleSwitchDirector: IDirector = {
  _id: "6ac3a9a18eb5511915a38e05",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-24T12:00:00.000Z"),
  updatedAt: new Date("2026-10-24T12:00:00.000Z"),
};
