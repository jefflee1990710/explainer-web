import type { IDirector } from "@/model/director";

const raw = {
  slug: "editorial-interview-director",
  title: "Editorial profile interview",
  description:
    "Stages a magazine-style off-camera interview (Esquire / GQ profile style): alternates between a seated rule-of-thirds A-roll interview (looking 15° off-camera at an unseen interviewer) and cinematic lifestyle / product-in-hand B-roll where the character's first-person voiceover continues seamlessly.",
  suggestedUseCase:
    "Founder & creator profiles, luxury / lifestyle brand collaborations, artist interviews, personal philosophy reels, and high-end product endorsements that blend craft stories with hands-on product moments.",
  sortOrder: 13,
  isActive: true,
  previewUrl:
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/talking-broll-director-preview-e3fa049bf3.webp",
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
  systemPrompt:
    "---\nname: directing-editorial-profile-interviews\ndescription: Use when filming a magazine-style profile interview (Esquire / GQ / Monocle style) that intercuts a seated off-camera interview (A-roll) with cinematic lifestyle and hands-on product B-roll while the speaker's first-person monologue flows continuously.\n---\n\n# Directing Editorial Profile Interviews\n\n## Core contract\n\nTurn a topic, creator note, or brand brief into a confirmed 3-act editorial interview proposal (Phase A) and one video prompt per clip (Phase B).\n\n- **First-person monologue (`englishVo`)**: Every clip carries the protagonist's calm, reflective first-person voiceover (e.g. 'To me, real craft is never on the surface…'). There is no unseen interviewer voice on the audio track.\n- **Two alternating clip roles (`narrativeJob`)**:\n  1. `interview-a-roll`: The protagonist sits in one consistent architectural room (e.g. sunlit harbour-view suite, designer studio, or quiet lounge), framed waist-up or chest-up using the rule of thirds, looking **15 degrees off-camera** toward an unseen interviewer beside the lens (never staring dead-center into the lens like a selfie). They speak `englishVo` on camera with calm, restrained lip articulation and thoughtful hand gestures.\n  2. `lifestyle-b-roll`: Cutaway that visually proves the monologue while the voiceover continues off-screen. Unlike generic stock B-roll, the protagonist stays in the visual world — practicing their craft (playing an instrument, sketching, working at a desk), standing in contemplative silhouette by a floor-to-ceiling window, examining the attached product in their hands, or using the product in their daily routine. During `lifestyle-b-roll`, the protagonist's mouth stays closed (silent on-screen action while their off-screen voiceover plays).\n- **3-Act Editorial Arc**:\n  - **Act 1 — Craft & Philosophy Hook (Opens on `interview-a-roll`, then `lifestyle-b-roll`)**: Open on the seated interview with a personal confession about craft, obsession with detail, or relentless refinement, followed by a lifestyle B-roll clip showing that devotion in action.\n  - **Act 2 — Daily Routine Bridge & Product Craft**: Connect that personal standard to their daily routine and introduce the product (if attached) as a natural extension of that philosophy — showing tactile material close-ups and the protagonist holding/inspecting the product.\n  - **Act 3 — Effortless Experience & Signature Sign-off (Ends on `interview-a-roll`)**: Show the product in effortless action, then return to the locked `interview-a-roll` setup for a calm, memorable closing aphorism.\n\n## Setup gate\n\nRequire these before planning:\n\n- source material (interview notes, philosophy, or brand/product brief)\n- aspect ratio: `16:9`, `9:16`, or `1:1`\n- exactly one character blueprint (the interviewee)\n- optional product reference(s) when the interview features a signature product\n\n## Workflow\n\n1. Read `references/editorial-interview-proposal-contract.md` and produce Phase A.\n2. Stop for approval.\n3. After approval, read `references/editorial-interview-prompt-contract.md` and produce Phase B.\n",
  references: [
    {
      path: "references/editorial-interview-proposal-contract.md",
      content:
        "# Editorial Profile Interview Proposal Contract (Phase A)\n\n## Header\n\n1. Titles in the planning language and in English\n2. Duration, clip count, loop mode: always Linear\n3. Core thesis (the shared philosophy between the interviewee's craft and their daily ritual)\n4. The locked `interview-a-roll` master setup (seat, architectural window/room, soft diffused daylight, 15° off-camera eyeline)\n5. Cast lock (1 interviewee) and any attached product lock\n\n## Storyboard rhythm\n\n- `narrativeJob` MUST start with either `interview-a-roll` or `lifestyle-b-roll`.\n- Clip 1 MUST be `interview-a-roll`.\n- Alternate rhythmically between `interview-a-roll` and `lifestyle-b-roll` (never more than two consecutive clips of the same type).\n- The final clip MUST return to `interview-a-roll` for the closing sign-off line.\n- Every `interview-a-roll` clip returns to the exact same seated room, lighting, and 15° off-camera eyeline.\n- Every `lifestyle-b-roll` clip keeps the character's mouth firmly closed (voiceover plays off-screen) while showing concrete craft action, window contemplation, or tactile product interaction.\n",
    },
    {
      path: "references/editorial-interview-prompt-contract.md",
      content:
        "# Editorial Profile Interview Clip Prompt Contract (Phase B)\n\nOne prompt per approved clip.\n\n1. Duration 5–12 seconds matched to the spoken line.\n2. If `narrativeJob` starts with `interview-a-roll`: seated rule-of-thirds waist-up or chest-up framing, eyes looking 15° off-camera toward the unseen interviewer, soft diffused window light, non-reflective matte skin texture, calm restrained on-camera lip-sync to `englishVo`, composed hand gestures returning to the lap or holding the product at chest level.\n3. If `narrativeJob` starts with `lifestyle-b-roll`: cinematic 35mm/50mm shallow-depth-of-field cutaway of the character in action (practicing their craft, looking out the harbour window, or using/examining the product). The character's mouth stays firmly closed (zero lip-sync) while the voiceover continues off-screen.\n4. Soft, even, low-contrast natural lighting and non-reflective matte human skin across every shot.\n",
    },
  ],
  profile: {
    bestFor:
      "Esquire / GQ style founder, artist, and creator interviews that weave personal craft philosophy into a daily routine or luxury product story.",
    structure:
      "3-act editorial arc (Craft Philosophy → Daily Routine & Product Craft → Closing Aphorism), alternating `interview-a-roll` and `lifestyle-b-roll` across 4–10 clips.",
    hook:
      "Opens on the seated off-camera interview with a candid personal reflection on obsession with detail and craft.",
    arc:
      "Starts with the interviewee's personal craft, bridges to how that standard shapes their daily routine and tools, and resolves back on the interview chair with a signature closing line.",
    narrator:
      "First-person monologue by the interviewee throughout: spoken on-camera during `interview-a-roll` clips and continuing as off-screen voiceover over `lifestyle-b-roll` cutaways.",
    visual:
      "A-roll uses a locked rule-of-thirds medium shot in a sunlit architectural suite with a 15° off-camera eyeline. B-roll intercuts hands-on craft, window silhouettes, and tactile product close-ups with shallow bokeh.",
    audio:
      "Continuous first-person voiceover in the character's voice; subtle in-world Foley on product demonstration beats.",
    rules:
      "Requires 1 character (and optional product). A-roll looks 15° off-camera at an unseen interviewer; B-roll keeps the character's mouth closed while their voiceover continues.",
  },
  behavior: {
    keyframeMode: "start-only",
    chainsClipStarts: false,
    anchorsFramesToFirstClip: false,
    dualBeat: false,
    maxBackgroundSets: 4,
    speechMode: "lip-sync",
    bansNarration: true,
    requiredCastCount: 1,
    selfShotCreatorCamera: false,
    forcesSceneText: false,
    allowsInWorldLabels: false,
    attachesTextStyleReference: true,
    requiresSpokenScript: false,
    allowsRoomBackgroundUpload: false,
    allowsOpeningPhotoUpload: false,
    allowsBrandLogoUpload: false,
    maxStyleCount: 1,
    hiddenInPicker: false,
  },
} as const;

// Hardcoded director definition for "editorial-interview-director".
export const editorialInterviewDirector: IDirector = {
  _id: "6ae2c9000000000000000019",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-29T04:50:00.000Z"),
  updatedAt: new Date("2026-10-29T04:50:00.000Z"),
};
