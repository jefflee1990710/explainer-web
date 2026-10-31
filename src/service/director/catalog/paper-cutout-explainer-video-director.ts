import type { IDirector } from "@/model/director";
import {
  DEFAULT_PAPER_CUTOUT_BACKGROUND_ID,
  PAPER_CUTOUT_PRESET_BACKGROUNDS,
} from "@/model/paper-cutout-backgrounds";

const raw = {
  slug: "paper-cutout-explainer-video-director",
  title: "Paper-cutout concept explainer",
  description:
    "Turns a concept or product into a tactile paper-cutout collage explainer — cutout objects, arrows, and diagram pieces with crisp white scissor borders paste onto a craft board across two beats per clip.",
  suggestedUseCase:
    "Creative brand explainers, tactile product storytelling, history & culture shorts, editorial social videos, and concept breakdowns that stand out with stop-motion craft aesthetics.",
  sortOrder: 1.5,
  isActive: true,
  previewUrl:
    "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/styles/paper-cutout-preview.webp",
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
name: directing-paper-cutout-explainer-videos
description: Use when turning copy, notes, articles, product briefs, or topics into high-retention paper-cutout collage explainer videos — concepts taught by pasting cut-out objects onto a craft board (Reels, TikToks, Shorts, decks).
---

# Directing Paper-Cutout Explainer Videos

## Core contract

Turn one source into a confirmed director's proposal (Phase A) and then standalone prompts (Phase B). Each clip is 5–12 seconds. Set durationSeconds from that clip's spoken line and the chosen speaking pace. A short line stays 5 seconds. A longer line is 6–12 seconds. Do not pad or cut the line to force 5 seconds. Clip count follows the narrative (e.g. 2–4 clips for 15s, 4–6 for 30s, 7–10 for 60s, or 1–2 for micro). Preserve the source's meaning while engineering high retention, dual hook stacking, and a delayed clean payoff — never a seamless loop.

## Setup gate

Require before planning:

- source material
- aspect ratio: \`16:9\`, \`9:16\`, or \`1:1\`
- optional: character reference image (visual guideline)

If required items are missing, ask once and stop. Never pick an aspect ratio silently. Do not ask for chalkboard inversion — the visual world is locked.

## Locked visual world

- Whole-canvas paper-cutout collage lock (applies to EVERY visual style): the entire video canvas edge-to-edge is a flat craft collage mounted on a single consistent dark warm-brown vertically-grained wooden craft board (identical dark wood-grain surface across every clip — never switch to a gridded cutting mat, floor tiles, felt, or plain black paper, and never stage a 3D room, studio building, floor, sky, or physical easel). The board IS the background: its wood grain fills 100% of the frame past all four edges — never show the board's edges, corners, or thickness, a wall or table behind it, or a shadow cast by the board.
- Flat camera & light lock (every clip, not just Clip 1): every Camera line looks square-on (perpendicular, flat top-down or straight-on frontal) at the board — never a three-quarter, side, oblique, low, high, dutch, or orbit angle that tilts the board into perspective. Vary clips only by shot size and which part of the board is framed (wide, medium, close-up, pan, push-in, pull-out). Every Light line is even, soft, diffused overhead light — never side-light or raking light.
- Every element is a separate paper cutout: people, products, icons, buildings, clouds, arrows, chart pieces, price tags. Each piece has a thick irregular white scissor / hand-cut border (magazine-photo edge). Soft drop shadows and slight layer offsets create depth against the dark wooden board.
- Colour contrast recipe: background / environment cutouts stay high-contrast black-and-white or kraft; the hero character, product, and key concept pieces stay in full colour so they pop.
- Craft texture: warm dark vertical wood grain across the board with visible paper grain on the cutouts. Stop-motion paste feel — pieces slide in, flip, stack, and settle with a tiny jitter; they never morph or melt.
- Single background plate lock: ONE shared dark warm-brown vertically-grained wooden craft-board surface for the whole video (every clip's Set MUST specify the exact same dark warm-brown vertically-grained wooden craft board; never switch surface textures between clips).
- Character Visual Guideline Lock: if a character reference is attached, follow it exactly across all clips (as a colour paper-cutout figure with the white border). If none, invent ONE simple cutout everyman / host and lock it — flat paper silhouette, white border, consistent wardrobe colours.
- Storytelling language: for every topic, a structured explanation collage is the main subject occupying 70–80% of the canvas — choose one explicit Diagram Archetype per clip from: (1) Split Matrix / Before-vs-After, (2) Causal Chain / Pipeline, (3) Funnel / Filter, (4) Balance Scale / Trade-off Seesaw, (5) Iceberg / Layered Stack, or (6) Quantitative Chart / Annotated Curve — built by pasting cutout objects, arrows, and tag strips onto the board. When a character is on screen, stage them in the remaining 20–30% lower-left or lower-right presenter zone interacting with the diagram (never blocking the center). Because single-frame image-to-video generates from the start still, \`startScene\` MUST already draw the complete structured diagram scaffold (all 4+ labeled cutout nodes, containers, axes, and connecting paths visible at t=0s). Prefer labeled paper pieces with concrete domain-specific terms in 「」 over empty metaphor props. Spoken line is the subtitle (selected text style). Diagram labels inside 「」 are ordinary cut-lettering on that paper piece.

## Workflow

1. Produce Phase A in the language setting: scene descriptions and voiceover both use that language.
2. Stop after the director's proposal and request explicit approval.
3. If the user changes ratio, narration, or staging, recompose Phase A and request approval again.
4. Only after approval, produce Phase B clip prompts.

## Output rules

- Each clip is 5–12 seconds from its spoken line (about 2.4 English words per second). A short line stays 5 seconds at medium pace (~2.5 words/s).
- 2-Second Visual Rule: a noticeable paste / slide / flip / punch-in every 1.5–2.5 seconds.
- First 3-Second Big Bold Hook Title (\`0–3s\` of Clip 1): unless on-screen text is turned off, Clip 1's \`startScene\` (and \`0–3s\` in \`motionCamera\`) MUST always feature ONE single BIG, BOLD HOOK TITLE cutout banner inside 「...」 in the user's configured on-screen text language, horizontally centered and placed slightly above the vertical center of the frame on a high-contrast solid plate with a thick solid border (never pinned to the top edge, and never split into two competing left/right small header stickers) so the first 3 seconds of the Reel immediately hook the viewer.
- Arrow & Sticker Hygiene: use at most ONE directional arrow cutout per clip (never clutter a frame or smartphone cutout with multiple red/green arrows, and never spawn an extra arrow in \`motionCamera\` if \`startScene\` already has one). Never use blank grey paper slash strips, masking-tape strips, or unlabelled cross-out stickers sliding over headers to cancel old items — flip the cutout card in place or slide the old card cleanly off-frame instead.
- Clip 1 stacks at least 2 hook types and uses at most one clean multi-plane parallax push-in or pull-out (zoom-out / push-in) on the flat craft board — accelerating through the change then decelerating into the landing, with the exact same 2D planar angle and side in both stills (no 360 orbit, no overhead drop, no 3D camera rotation). Later clips do not repeat that hook camera.
- Delayed payoff: do not reveal the core punchline in the opening clip.
- Always narrated: an unseen off-screen narrator speaks every line in the third person. On screen the character never speaks and never lip-syncs. No first-person character intros.
- Content-driven acting: the character's facial expression and body language act out the emotion of that clip's spoken line (exciting line → bright eyes, lifted brows, closed-lip smile, energetic open arms; problem → knitted brows, tense or slumped shoulders; reveal → raised brows, leaning in; payoff → proud closed-lip smile, confident stance), and the gaze and hands direct attention to the teaching cutout the narrator is naming at that moment. Name the emotion in each still's Character line and in every motionCamera beat. Never repeat the previous clip's expression.
- When a character is attached, each clip has exactly one primary body action from: push, pull, stack, lift, place, toss, plug, sketch an arrow, flip a card, turn the dial, stretch, squeeze, magnify, jump, point toward the camera. Do not reuse an action from either of the previous two clips. Jump at most once. The last clip never points toward the camera. Alternate starting sides; ~80% stay on that side; ~20% rare lateral crosses. startScene / endScene are before and after of that one action.
- Visual density: at least four distinct cutout teaching elements on the explanation collage, besides the character. Name each one in the scene (what it is, which part of the concept it explains, where it sits) and give each one a timed beat in the camera motion (when it pastes, slides, flips, or stacks, and how the camera reveals it). Never a near-empty board with one floating label.
- On-canvas beat text: never write Subtitle: on the stills for planning. A short beat title or diagram label may sit inside 「」 on the paper piece it belongs to.
- Match each clip ending to the next opening. Final clip ends on a clean resting payoff — never loop back to Clip 1.
- Do not invent unsupported facts, statistics, quotations, or product claims.
- Name colours only with ordinary words. Never hexadecimal or RGB codes.

## Revision rules

Recompose for ratio:

- \`16:9\`: stage across left–center–right; lateral paste wipes.
- \`9:16\`: stacked vertical layers; depth via overlapping cutouts.
- \`1:1\`: compact central collage; short travel paths.

## Final check

Every topic has a pasted explanation collage. White borders on every cutout. Colour hero on mono/kraft background. Silent demonstrator. Narrator on every clip. Delayed payoff. Linear ending.
`,
  references: [
    {
      path: "references/paper-cutout-storyboard.md",
      content: `# Paper-Cutout Director's Proposal Contract

Use for Phase A. Stop for confirmation before model prompts.

## Rewrite the source

Create one natural narration scaled to duration (~2.2–2.5 words/s medium). Hook stacking in second 0–2. Delay the payoff. Preserve facts; invent none.

## Header

1. English + reference-language titles
2. Duration, clip count N (each 5–12s, from the spoken line and pace), loop: Linear
3. Core message + hook stack
4. Aspect ratio + locked paper-cutout collage world
5. Narrator identity + word count
6. Character lock (reference cutout or default locked cutout host) + palette in ordinary words
7. BGM / emotional arc

Narrator is always unseen third-person off-screen. Character is a silent paper demonstrator.

## Storyboard rows

| Clip # & Time | Narrative job | Explainer scene | Motion, camera & transition | VO | Reference | BGM / SFX |

Every row: timed beats; 2-second visual rule; explanation collage as spine; at least four cutout teaching elements paste / slide / flip / stack. When a character is on, one primary action from the director list; start/end are before/after of that action.

## Scene detail

Write startScene / endScene as: Character → Set (collage graph + cutouts) → Light → Camera. In Set, number at least four teaching cutouts: what each piece is, which part of the concept it explains, and where it sits. Never restate wardrobe appearance (follows character lock). In motionCamera, give each of those cutouts its own timed beat and the camera move that reveals it.

## Confirmation

Ask to approve, revise a named beat, or change ratio / voice / pacing. Do not emit Phase B prompts yet.
`,
    },
    {
      path: "references/paper-cutout-prompt-contract.md",
      content: `# Paper-Cutout Clip Prompt Contract (Phase B)

Use only after Phase A approval. One self-contained prompt per clip.

## Prompt order

1. Output: 5–12s from the spoken line, aspect ratio, 720p, 24 FPS, synced audio
2. Collage lock: dark warm-brown vertically-grained wooden craft board (identical wood-grain surface in every clip; no grid mat or tiles), thick white scissor borders on every piece, colour hero on mono/kraft background layers, soft shadows, stop-motion paste feel
3. Character lock: colour paper cutout following the guideline (or locked host); silent, closed mouth
4. Palette in ordinary colour names
5. Composition for the ratio
6. First-frame state inherited from previous clip
7. Timed beats: each of the at least four teaching cutouts pastes, slides, flips, or stacks on its own beat, and the camera pushes, pans, or pulls to reveal that piece
8. Exact audio-only dialogue once
9. Identical narrator description
10. No BGM in the prompt — short SFX only (paper slide, slap, pop)
11. Final-frame handoff or resting payoff
12. Negatives: no photoreal room, no visible board edges / wall / board shadow, no tilted three-quarter or side angle on the board, no missing white borders, no morphing melt, no lip-sync, no captions of the VO, no technical colour codes

## Dual-keyframe

Start and end stills are one continuous paste-motion shot. Animate the one action with anticipation → snap → settle while collage pieces slide in as rigid paper. Never morph or dissolve pieces.
`,
    },
  ],
  profile: {
    bestFor:
      "Turning a concept, product, or set of notes into a paper-cutout collage explainer — ideas taught by pasting cut-out objects, products, and diagram pieces onto a craft board.",
    structure:
      "Each clip is 5–12 seconds, set by the spoken line and pace; count follows content (about 1–2 micro, 2–4 for 15–20s, 4–6 for 30–45s, 7–10 for 50–60s).",
    hook: "Clip 1's first 3 seconds (0–3s and startScene) always open with a BIG, BOLD HOOK TITLE cutout banner inside 「...」 in the user's configured on-screen text language (unless on-screen text is turned off), paired with a punchy spoken line and one clean multi-plane parallax push-in or pull-out camera move on the explanation collage.",
    arc: "Surprise → setup → how it works (pasted diagram) → consequence → takeaway, or pain → product reveal as a colour cutout → proof → CTA. Hold the main answer until near the end.",
    narrator:
      "An unseen off-screen narrator speaks every line. On screen the paper-cutout character stays silent and never lip-syncs; they demonstrate by stacking, flipping, and pointing at cutout pieces.",
    visual:
      "Flat craft collage on a single consistent dark warm-brown vertically-grained wooden craft board: thick irregular white scissor borders on every piece, mono/kraft background cutouts, full-colour hero character and concept pieces, soft shadows, stop-motion paste motion. Each clip names at least four teaching cutouts in the scene and moves the camera across them.",
    audio: "Voice-forward mix with paper-slide / slap / pop SFX timed to paste events. BGM follows the emotional turn.",
    rules:
      "Pick an aspect ratio. Keep the source's meaning. Every topic gets a pasted explanation collage. White borders on every cutout. Colour hero on mono background. Approve the storyboard before any video.",
  },
  behavior: {
    keyframeMode: "start-only",
    chainsClipStarts: false,
    anchorsFramesToFirstClip: false,
    dualBeat: true,
    maxBackgroundSets: 1,
    speechMode: "narrator",
    bansNarration: false,
    requiredCastCount: 1,
    selfShotCreatorCamera: false,
    forcesSceneText: false,
    allowsInWorldLabels: true,
    attachesTextStyleReference: true,
    requiresSpokenScript: false,
    allowsRoomBackgroundUpload: true,
    allowsOpeningPhotoUpload: false,
    allowsBrandLogoUpload: false,
    maxStyleCount: 1,
    hiddenInPicker: false,
  },
  presetBackgrounds: PAPER_CUTOUT_PRESET_BACKGROUNDS,
  defaultBackgroundId: DEFAULT_PAPER_CUTOUT_BACKGROUND_ID,
} as const;

// Hardcoded director: paper-cutout collage concept explainer (sibling of whiteboard explainer).
export const paperCutoutExplainerVideoDirector: IDirector = {
  _id: "6aa638b869984c5f26804544",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-24T11:00:00.000Z"),
  updatedAt: new Date("2026-10-24T11:00:00.000Z"),
};
