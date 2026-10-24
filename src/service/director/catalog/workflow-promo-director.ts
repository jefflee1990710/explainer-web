import type { IDirector } from "@/model/director";

const raw = {
  slug: "workflow-promo-director",
  title: "Workflow & ROI promo",
  description:
    "High-velocity conversion reel that opens with a pattern-interrupt hook, contrasts old friction with clarity, walks through a 3-step linear product workflow, and lands on a device + analytics ROI payoff and brand outro in your chosen visual style.",
  suggestedUseCase:
    "SaaS & AI tool launches, B2B workflow explainers, agency service promos, app conversion ads, and product reels demonstrating 'Input → Process → ROI Result'.",
  sortOrder: 17,
  isActive: true,
  previewUrl:
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/product-demo-director-preview-8c340b71f3.webp",
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
name: directing-workflow-promo-videos
description: Use when turning SaaS pitches, product workflows, tool launches, or ROI value propositions into high-velocity workflow promo reels (pattern-interrupt hook → problem vs. clarity → 3-step linear workflow → device & ROI analytics payoff → brand outro) in any chosen visual style.
---

# Directing Workflow & ROI Promo Videos

## Core contract

Turn one product or workflow brief into a confirmed director's proposal (Phase A) and then standalone clip prompts (Phase B). Each clip runs 5–8 seconds with two distinct beats per clip (\`startScene\` / \`endScene\` and \`startVo\` / \`endVo\`). Preserve the source's factual workflow and value proposition while engineering a high-retention promo arc — pattern-interrupt hook, problem/solution contrast, step-by-step workflow pipeline, tangible ROI / analytics payoff, and a clean brand sign-off.

## Style-agnostic visual rule

- **Zero hardcoded styling**: never hardcode a dark void, whiteboard, paper collage, or specific color hexes. Canvas background, surface rendering, line treatment, lighting, and color palette come 100% from the selected visual style.
- Express every UI card, workflow step node, connector arrow, device mockup, and analytics chart natively inside the chosen visual style's medium and materials.

## Narrative & visual arc

1. **Clip 1 — Pattern-Interrupt Hook + Bold Thesis**:
   - Beat 1 (\`startScene\` / \`startVo\`): An attention-grabbing visual metaphor or character reaction interrupting the scroll (e.g., an alarm/alert prop, a cluttered old workflow breaking apart, or a sharp surprise beat) paired with a punchy 2–4 word hook headline.
   - Beat 2 (\`endScene\` / \`endVo\`): Resolves into a bold statement of the core promise over the scattered old-way clutter, establishing what changes today.
2. **Middle Clips — Linear 3-Step Workflow Pipeline**:
   - Walk through the product or service's 3-step workflow clearly (e.g., \`1. Input / Concept\` → \`2. Review / Approve\` → \`3. Ship / Launch\`).
   - Show numbered step cards, connected nodes, or interactive workspace stages progressing in sequence. Beat 1 introduces or activates the step; Beat 2 completes the step or advances the pipeline arrow to the next stage.
   - Short in-world step labels inside \`「」\` (1–3 words, such as \`「1. Concept」\`, \`「2. Approve」\`, \`「3. Ship」\`) are encouraged on workflow nodes.
3. **Final Clip — Device Showcase, ROI Payoff & Brand Outro**:
   - Beat 1 (\`startScene\` / \`startVo\`): The finished output playing inside a sleek device frame (phone, laptop, or display) alongside rising analytics/metric indicators (growth chart, conversion uptick, time saved) with the character celebrating the result.
   - Beat 2 (\`endScene\` / \`endVo\`): Settles onto a clean, confident brand sign-off card with the brand name, tagline, or attached logo centered clearly.

## Voice, character & camera rules

- **Narrator**: An energetic, confident unseen off-screen narrator speaks the voiceover (\`startVo\` and \`endVo\`). On-screen characters never speak and never lip-sync — their mouths stay closed while they interact with workflow nodes, cards, or devices.
- **Character**: If a character blueprint is attached, lock their face, hair, and outfit strictly to the blueprint across every clip in which they appear.
- **Camera & pacing**: Fast, kinetic transitions — crisp push-ins, lateral workflow tracking pans across step nodes, and clean settle holds on the final payoff. Never loop back to Clip 1.

## Workflow

1. Read \`references/workflow-promo-proposal-contract.md\` and produce Phase A in the requested planning language.
2. Stop after Phase A and wait for approval.
3. Only after approval, read \`references/workflow-promo-prompt-contract.md\` and produce Phase B clip prompts.
`,
  references: [
    {
      path: "references/workflow-promo-proposal-contract.md",
      content: `# Workflow & ROI Promo Proposal Contract (Phase A)

Use for Phase A. Stop for confirmation before model prompts.

## Arc requirements

- **Clip 1**: Beat 1 is the pattern-interrupt hook; Beat 2 is the core thesis contrasting old friction with the new workflow.
- **Middle clips**: Unpack the 3-step workflow in clear linear order (\`Step 1\` → \`Step 2\` → \`Step 3\`). Each clip's \`startScene\` and \`endScene\` must show a concrete state change along the pipeline.
- **Final clip**: Beat 1 showcases the finished deliverable on a device with measurable ROI / growth visuals; Beat 2 settles on the brand sign-off card.

## Dual-beat row contract

Every clip row MUST populate:
- \`startScene\` and \`endScene\`: full four-part scene descriptions (Character/Subject, Set, Light, Camera) rendered in the chosen visual style.
- \`startVo\` and \`endVo\`: the two halves of the clip's spoken voiceover, with \`englishVo\` equal to \`startVo + " " + endVo\`.
- Short in-world step labels on cards or nodes use \`「」\` (1–3 words max). Never write \`Subtitle:\` in scene descriptions.
- \`bgmSfx\`: crisp kinetic UI/transition sound effects only (whooshes, card snaps, chime pops); no background music.
`,
    },
    {
      path: "references/workflow-promo-prompt-contract.md",
      content: `# Workflow & ROI Promo Prompt Contract (Phase B)

Write one standalone video prompt per approved clip:
1. State duration, aspect ratio, and the chosen visual style's rendering lock.
2. Transition smoothly from \`startScene\` (Beat 1) to \`endScene\` (Beat 2) with kinetic camera motion and clear prop/UI state progression.
3. Unseen off-screen narrator speaks the voiceover; on-screen characters keep their mouths closed with expressive brow and eye reactions.
4. SFX only as specified in \`bgmSfx\`; no background music.
`,
    },
  ],
  profile: {
    bestFor:
      "SaaS launches, product workflow explainers, agency promos, and conversion reels that turn a messy problem into a 3-step workflow and ROI payoff.",
    structure:
      "Dual-beat clips (5–8s each): Clip 1 hooks and states the thesis, middle clips walk through the 3-step workflow, and the final clip lands the ROI showcase and brand outro.",
    hook: "Opens with a pattern-interrupt alert or friction moment in Beat 1, then snaps into a bold thesis in Beat 2.",
    arc: "Pattern-Interrupt Hook → Problem vs. Thesis → Step 1 → Step 2 → Step 3 Workflow → Device & Analytics ROI Payoff → Brand Outro.",
    narrator:
      "Confident off-screen narrator reads the two-beat voiceover. On-screen characters act out the workflow with mouths closed.",
    visual:
      "100% driven by the selected visual style — no hardcoded dark void or whiteboard. Workflow cards, numbered step nodes, devices, and ROI charts adapt natively to your chosen style.",
    audio: "Crisp UI snaps, whooshes, and metric pop sound effects. No background music.",
    rules:
      "Two beats per clip (startScene/endScene + startVo/endVo). Short step labels in 「」 allowed. Style comes strictly from the chosen visual style.",
  },
  behavior: {
    keyframeMode: "start-only",
    chainsClipStarts: false,
    anchorsFramesToFirstClip: false,
    dualBeat: true,
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
    maxStyleCount: 1,
    hiddenInPicker: false,
  },
} as const;

// Hardcoded director definition for "workflow-promo-director".
export const workflowPromoDirector: IDirector = {
  _id: "6ac3a9a18eb5511915a38e04",
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
