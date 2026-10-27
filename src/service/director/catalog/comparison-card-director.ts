import type { IDirector } from "@/model/director";

const raw = {
  "slug": "comparison-card-director",
  "title": "Comparison card",
  "description": "Splits every clip into two simultaneous side-by-side (16:9) or top-and-bottom (9:16 / 1:1) panels with persistent corner titles so viewers immediately see two contrasting realities at once.",
  "suggestedUseCase": "Before vs. After transformations, Myth vs. Fact breakdowns, Amateur vs. Pro comparisons, Expectation vs. Reality skits, and Old Way vs. New Way product contrasts.",
  "sortOrder": 11,
  "isActive": true,
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/comparison-card-director-preview-a2aa0a3cf2.webp",
  "inputSchema": {
    "requiresSource": true,
    "aspectRatios": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "durationPresets": [
      "micro",
      "short",
      "punchy",
      "full"
    ],
    "optionalCharacterImage": true
  },
  "higgsfieldDefaults": {
    "imageModel": "alibaba/qwen-image-3/text-to-image",
    "imageQuality": "medium",
    "imageResolution": "1k",
    "videoModel": "minimax/h3/image-to-video"
  },
  "systemPrompt": "---\nname: directing-comparison-cards\ndescription: Use when one subject needs two views at once — top/bottom or left/right — such as what you see versus what they see, before versus after, or myth versus fact.\n---\n\n# Directing Comparison Cards\n\n## Core contract\n\nTurn one source into a confirmed proposal (Phase A) and then one video prompt per clip (Phase B). Every clip is a single split frame: two views of the same subject, both visible at once. This is not a listicle and not a story with scene changes.\n\n## Setup gate\n\nRequire these before planning:\n\n- source material\n- aspect ratio: `16:9`, `9:16`, or `1:1`\n- optional: one host character\n\nIf required items are missing, ask for them in one concise message and stop.\n\n## Split\n\n- `16:9`: left half and right half. Panel A is left. Panel B is right.\n- `9:16` and `1:1`: top half and bottom half. Panel A is top. Panel B is bottom.\n- A thin divider may separate the halves. Never a third panel. Never a full-bleed single picture.\n\n## On-canvas text\n\n- Each clip's `narrativeJob` is exactly `contrast: <panel A title> | <panel B title>`.\n- Those two short titles are the only writing. Do not caption the voiceover.\n- Titles stay in the same corners every clip.\n\n## Narration\n\n- Unseen narrator, second person or third person, in the chosen voiceover language.\n- About 7–20 spoken words per clip at medium pace.\n- The line names the contrast. It does not read both titles aloud word for word if that makes the clip too long.\n\n## Architecture\n\n1. Clip 1: the split is already up; the hook names both sides.\n2. Middle clips: change the pictures inside the halves. Keep the split.\n3. Last clip: both halves at rest, and the point has landed. No loop back to clip 1.\n\n## Workflow\n\n1. Read `references/comparison-proposal-contract.md` and produce Phase A.\n2. Stop for approval.\n3. After approval, read `references/comparison-prompt-contract.md` and produce Phase B.\n",
  "references": [
    {
      "path": "references/comparison-prompt-contract.md",
      "content": "# Comparison Card Clip Prompt Contract (Phase B)\n\nOne prompt per approved clip.\n\n1. Duration 5–12 seconds, from the spoken line and pace, aspect ratio, the split (left/right or top/bottom).\n2. Style lock from the Visual style block.\n3. Both panel titles spelled exactly from `narrativeJob`. They are the only writing.\n4. Scene at t=0: both halves already visible.\n5. Timed beats: one half changes, then the other. The divider stays. No cut to a single picture.\n6. Narrator line quoted once as audio. No voiceover caption.\n7. Last clip rests on both halves. No loop.\n\nColours in ordinary words only.\n"
    },
    {
      "path": "references/comparison-proposal-contract.md",
      "content": "# Comparison Card Proposal Contract (Phase A)\n\n## Header\n\n1. Titles in the reference language and in English\n2. Duration, clip count, loop mode: always Linear\n3. The contrast in one sentence, and which side is panel A\n4. Aspect ratio and the split (left/right or top/bottom)\n5. Narrator voice\n6. Cast lock if a host is attached; otherwise say there is no host\n\n## Storyboard\n\nEach row is one split. `narrativeJob` is `contrast: <panel A title> | <panel B title>`.\n\n`explainerScene` describes both pictures and where the host stands, if any. Do not repeat the title wording inside the scene; the titles are taken from `narrativeJob`.\n\n`motionCamera` is timed beats inside the same split: one half changes, then the other, camera stays locked. No cut to a single full-frame shot.\n\n## Counts\n\n- **4–8s micro**: 1–2 clips\n- **15–20s**: 2–4 clips\n- **30–45s**: 4–6 clips\n- **50–60s**: 6–8 clips\n\nThe last clip rests. Both halves stay visible.\n"
    }
  ],
  "profile": {
    "bestFor": "One idea shown as two views at once — what you see vs what they see, before vs after, myth vs fact — for Reels and Shorts.",
    "structure": "Each clip is 5–12 seconds, set by the spoken line and pace and is one split frame. About 1–2 clips for micro, 2–4 for 15–20s, 4–6 for 30–45s, and 6–8 for 50–60s. The last clip rests with both halves visible.",
    "hook": "Opens on the split already in frame and names the contrast in the first two seconds. No greeting, no empty title card.",
    "arc": "Hook states the two sides. Middle clips change what each half shows while the split stays. The last clip lands the point with both halves still on screen.",
    "narrator": "An unseen narrator names the contrast. The only on-canvas writing is the two short panel titles.",
    "visual": "Look and palette come from the chosen visual style. 16:9 is left and right. 9:16 and 1:1 are top and bottom. Both halves stay in frame together.",
    "audio": "No background music. One soft hit when a half changes. The narrator line is audio; it is not captioned under the titles.",
    "rules": "Titles come from the source. Do not invent a third panel, a numbered list, or a full voiceover caption. A host is optional and must not cover either title."
  },
  "behavior": {
    "keyframeMode": "start-only",
    "chainsClipStarts": false,
    "anchorsFramesToFirstClip": false,
    "dualBeat": false,
    "maxBackgroundSets": 4,
    "speechMode": "narrator",
    "bansNarration": false,
    "requiredCastCount": 1,
    "selfShotCreatorCamera": false,
    "forcesSceneText": false,
    "allowsInWorldLabels": false,
    "attachesTextStyleReference": true,
    "requiresSpokenScript": false,
    "allowsRoomBackgroundUpload": false,
    "allowsOpeningPhotoUpload": false,
    "allowsBrandLogoUpload": false,
    "maxStyleCount": 1,
    "hiddenInPicker": false
  }
} as const;

// Hardcoded director definition for "comparison-card-director".
export const comparisonCardDirector: IDirector = {
  _id: "6ac1fde78eb5511915a27fd7",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-04T07:19:02.439Z"),
  updatedAt: new Date("2026-10-16T07:54:16.226Z"),
};
