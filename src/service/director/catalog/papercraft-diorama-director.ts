import type { IDirector } from "@/model/director";

const raw = {
  slug: "papercraft-diorama-director",
  title: "3D papercraft diorama explainer",
  description:
    "Turns a business, startup, finance, or product concept into a tactile 3D cardstock miniature diorama explainer (Founder Notes style) — zero human characters, where each chapter uses folded 300gsm cardstock props, flat-lay envelopes, isometric shopfronts, and balance scales across two beats per clip.",
  suggestedUseCase:
    "Startup & VC explainers, SaaS business models, financial literacy, economics & mental models, founder notes, and editorial concept breakdowns.",
  sortOrder: 1.6,
  isActive: true,
  previewUrl: "/hero/styles/papercraft-diorama-preview.webp",
  inputSchema: {
    requiresSource: true,
    aspectRatios: ["16:9", "9:16", "1:1"],
    durationPresets: ["micro", "short", "punchy", "full"],
    optionalCharacterImage: false,
  },
  higgsfieldDefaults: {
    imageModel: "alibaba/qwen-image-3/text-to-image",
    imageQuality: "medium",
    imageResolution: "1k",
    videoModel: "minimax/h3/image-to-video",
  },
  systemPrompt: `---
name: directing-papercraft-diorama-explainers
description: Use when turning startup notes, business models, economics concepts, articles, or product briefs into tactile 3D cardstock miniature diorama explainers (Founder Notes style) with zero human characters and two spoken beats per clip.
---

# Directing 3D Papercraft Diorama Explainers (Founder Notes Style)

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and standalone per-clip video prompts (Phase B). Each clip is 5–12 seconds, set by its two spoken beats (\`startVo\` + \`endVo\`) and speaking pace. Preserve the source's logic while staging every clip as a distinct, tactile **3D cardstock miniature diorama or flat-lay craft composition** — with **ZERO human characters**.

## Locked visual world (\`papercraft-diorama\`)

- **Fixed visual style**: This director is permanently locked to the \`papercraft-diorama\` visual style. Every object, room wall, counter, shopfront, envelope, coin, pie-chart certificate, ribbon, and balance scale is crafted from **thick matte 300gsm textured construction paper / heavy cardstock** with crisp scored and folded geometric bevel edges, visible paper fiber grain, layered paper thickness, and soft studio tabletop lighting with shallow macro depth-of-field.
- **Strictly NO 2D white scissor borders**: Unlike flat magazine cutouts, these are 3D folded cardstock architectural models and tactile tabletop paper objects.
- **Strictly ZERO human characters**: Never draw people, faces, hands, or cartoon hosts in any clip. \`characterLock\` MUST state: \`"No on-screen characters — pure 3D cardstock diorama objects and miniature architectural sets."\`.
- **Curated editorial cardstock palette**: Deep cobalt & navy blue, warm mustard yellow, terracotta coral red, deep teal, and warm cream/ivory paper.
- **Camera & Diorama Set Archetypes (vary across clips — never repeat the same framing twice in a row)**:
  1. \`diorama-interior\` (eye-level or slight 3/4 miniature interior): e.g., a ribbed navy cardstock counter with a folded terracotta-red payment terminal printing a jagged-edge cream paper receipt, a yellow folded cardstock chair, and a deep-teal arched backdrop wall.
  2. \`flat-lay-top-down\` (90° overhead flat-lay on solid mustard-yellow or teal cardstock): e.g., a folded navy cardstock envelope holding embossed gold paper coins beside a folded cream cardstock equity certificate with a blue-and-yellow cardstock pie chart, corner mounts, and a scalloped red paper wax seal with ribbon tails.
  3. \`isometric-street\` (3/4 isometric miniature street / multi-unit diorama): e.g., a row of three side-by-side navy-blue cardstock shopfronts with terracotta scalloped awnings and miniature barber poles linked together by one continuous looping cream paper receipt ribbon.
  4. \`studio-scale-closeup\` (straight-on studio hero object on a deep royal-blue cardstock stage): e.g., a 3D folded gold cardstock balance scale weighing a tall stack of red-and-cream receipt tickets on the left pan against a stack of gold paper coins on the right pan.
- **Chapter Banner & Beat Tag**:
  - When on-screen text or in-world labels are enabled, each clip's \`startScene\` may include one short chapter title inside 「...」 (2–4 words, e.g. 「One Paying Customer」, 「Venture-Backed」, 「One Product, More Shops」, 「Does It Scale?」) printed on a torn-edge warm cream cardstock banner strip taped at the top corners with two small kraft masking-tape tabs. Never write full voiceover sentences on the scene.

## Dual-Beat Rhythm & Tactile Mechanics

- **Dual-Beat Cause-and-Effect Transformation**: Every clip has two spoken beats (\`startVo\` for Beat 1, \`endVo\` for Beat 2) spoken by a calm, clear unseen off-screen narrator, staging one clear physical state transformation (\`State A: ❌ bottleneck / problem / unit input\` → \`tactile cardstock mechanism\` → \`State B: ✅ unlocked scale / payoff / output\`) so a viewer with sound off immediately grasps the cause-and-effect logic.
- **Concrete Physical Metaphors & Single Hero Accent**: Never use plain flat text cards to explain an idea; represent every concept as a concrete 3D folded cardstock object showing its physical state (e.g. a jammed vs flowing receipt printer, a tipping vs balanced scale, an empty vs coin-filled envelope), with 70–80% of supporting set pieces in calm navy/teal/cream tones and the single active takeaway object highlighted in warm mustard yellow or terracotta coral red at 1.5x focal prominence.
- \`motionCamera\` animates one physical papercraft mechanism across the clip: a jagged paper receipt ribbon feeding upward out of a cardstock slot, embossed gold paper coins sliding into a cardstock envelope while a pie-chart wedge settles, a continuous paper ribbon looping across multiple miniature shopfronts, or a folded gold cardstock balance scale tipping and settling with physical weight. Cardstock pieces stay rigid and never morph, melt, or dissolve.
`,
  references: [
    {
      path: "references/papercraft-diorama-storyboard.md",
      content: `# 3D Papercraft Diorama Storyboard Contract (Phase A)

## Header

1. Title in the planning language and in English
2. Total duration, clip count N (each 5–12s from its two spoken beats), loop mode: always Linear
3. Core thesis and how Clip 1's concrete cardstock object hooks the viewer before scaling the concept in later clips
4. Aspect ratio + locked 3D 300gsm textured cardstock diorama world (cobalt blue, mustard yellow, terracotta red, deep teal, warm cream)
5. Unseen off-screen narrator voice and word count
6. Character lock: always "No on-screen characters — pure 3D cardstock diorama objects and miniature architectural sets."
7. Clip-by-clip progression alternating across the 4 Diorama Set Archetypes (\`diorama-interior\`, \`flat-lay-top-down\`, \`isometric-street\`, \`studio-scale-closeup\`)

## Per-clip dual-beat rules

- Each clip row defines \`startScene\`, \`endScene\`, \`startVo\`, \`endVo\`, and \`motionCamera\`.
- \`startScene\` and \`endScene\` share the same cardstock diorama set and camera angle for that clip, describing the physical before-and-after state of the cardstock mechanism (e.g. receipt strip half-printed vs. fully extended; balance scale tipping vs. settled).
`,
    },
    {
      path: "references/papercraft-diorama-prompt-contract.md",
      content: `# 3D Papercraft Diorama Clip Prompt Contract (Phase B)

Write one self-contained prompt per clip:

1. Output spec: duration (5–12s), aspect ratio, 24 FPS, synchronized narrator voiceover and tactile paper Foley.
2. Style lock: 3D tactile 300gsm matte textured cardstock diorama with crisp scored and folded geometric bevel edges, visible paper fiber grain, soft studio tabletop lighting, shallow macro depth-of-field, and cobalt/mustard/terracotta/teal/cream palette. Zero human characters and zero white scissor borders.
3. Scene at t=0: exact cardstock set, camera angle (\`diorama-interior\`, \`flat-lay-top-down\`, \`isometric-street\`, or \`studio-scale-closeup\`), and 3D folded paper props matching the start keyframe.
4. Timed beats: Beat 1 (\`startVo\`) and Beat 2 (\`endVo\`) driven by physical papercraft mechanics (paper ribbon feeding, coins sliding, scale tipping, camera slow push-in or pan).
`,
    },
  ],
  profile: {
    bestFor:
      "Startup & VC concepts, SaaS business models, economics, financial literacy, and Founder Notes explainers taught through tactile 3D cardstock miniature dioramas with zero human characters.",
    structure:
      "Each clip is 5–12 seconds with two spoken beats (startVo + endVo) and one distinct 3D cardstock diorama set (4 clips for ~28–35s, 6–8 clips for 50–60s).",
    hook:
      "Opens on a concrete, tactile 3D cardstock miniature scene (such as a folded red cardstock terminal printing a paper receipt inside a miniature shop) with a taped torn-paper chapter banner at the top.",
    arc:
      "Builds from a single unit example (Clip 1 interior diorama) → capital or mechanism (Clip 2 overhead flat-lay envelope & chart) → replication at scale (Clip 3 isometric street of multiple shops) → final trade-off or payoff (Clip 4 cardstock balance scale).",
    narrator:
      "An unseen off-screen narrator speaks every line across two beats per clip. Zero on-screen human characters.",
    visual:
      "Permanently locked to the 3D Papercraft Diorama style (300gsm matte textured cardstock, scored & folded 3D geometry, macro tabletop depth-of-field, cobalt blue / mustard yellow / terracotta red / deep teal / warm cream palette).",
    audio:
      "Crisp narrator voiceover paired with subtle tactile paper-craft Foley (paper sliding, ticket printing, gentle cardstock clicks).",
    rules:
      "Visual style is fixed to 3D Papercraft Diorama. No characters or hands on screen. Alternate camera angles across interior diorama, 90° flat-lay, isometric street, and studio hero close-up.",
  },
  behavior: {
    keyframeMode: "start-only",
    chainsClipStarts: false,
    anchorsFramesToFirstClip: false,
    dualBeat: true,
    maxBackgroundSets: 4,
    speechMode: "narrator",
    bansNarration: false,
    requiredCastCount: 0,
    selfShotCreatorCamera: false,
    forcesSceneText: false,
    allowsInWorldLabels: true,
    attachesTextStyleReference: false,
    requiresSpokenScript: false,
    allowsRoomBackgroundUpload: false,
    allowsOpeningPhotoUpload: false,
    allowsBrandLogoUpload: false,
    maxStyleCount: 1,
    lockedStyleId: "papercraft-diorama",
    hiddenInPicker: false,
  },
} as const;

// Hardcoded director definition for "papercraft-diorama-director".
export const papercraftDioramaDirector: IDirector = {
  _id: "6ae2ca000000000000000021",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-11-06T03:00:00.000Z"),
  updatedAt: new Date("2026-11-06T03:00:00.000Z"),
};
