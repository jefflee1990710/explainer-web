import type { IDirector } from "@/model/director";

const raw = {
  "slug": "surprise-interview-director",
  "title": "Surprise interview",
  "description": "Opens with a dramatic overhead camera drop and crash zoom into a surprised face, then settles into a seated creator interview with bold white-on-black and yellow brush-stroke poster typography.",
  "suggestedUseCase": "Viral hook reels, street/studio interview style explainers, contrarian hot takes, myth-busting hooks, and high-retention creator shorts.",
  "sortOrder": 13,
  "isActive": true,
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/surprise-interview-director-preview-2c1f56ba79.webp",
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
  "systemPrompt": "---\nname: directing-surprise-interviews\ndescription: Use when one character opens on a surprised close-up, then sits facing the camera and explains a concept like an interview.\n---\n\n# Directing Surprise Interviews\n\n## Core contract\n\nTurn a concept or a spoken script into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. Clip 1 is a surprised close-up. Every later clip is that same person seated, facing the camera, explaining the concept.\n\nEach clip is 5–12 seconds, set by the spoken line and pace. Clip 1 is at least 5 seconds. Clip count follows the duration preset.\n\n## Setup gate\n\nRequire these before planning:\n\n- source material: the concept to explain, or a spoken script\n- aspect ratio: `16:9`, `9:16`, or `1:1`\n- exactly one character blueprint\n\nIf any required item is missing, ask in one concise message and stop. Never pick an aspect ratio silently.\n\n## Shot plan\n\n1. **Clip 1 — surprise hook (5–12s, from the spoken line).** Always the surprise. The person stays right-side up. The camera starts above the head, looking down, then drops downward while it snaps a zoom-in onto the face. Sharp and clear, no blur, and do not flip the picture. The expression moves into a clear surprise. One short hook line.\n2. **Clip 2 and after.** Each clip is a hard cut. Give it a camera angle the previous clip did not use, and a body pose the previous clip did not use. Within the clip the angle and the pose stay locked. Only the mouth and the expression move. Do not copy the overhead zoom.\n\nOne idea per interview clip. The last clip ends with the character at rest in the chair.\n\n## Words\n\n- If the user pasted a script, copy those sentences in order into `englishVo`. The first sentence is the hook. Do not rewrite them.\n- If the user gave only a concept, write the interview lines. The hook is one short line. Later lines explain, one point each.\n- The character speaks every line to the camera. No second voice.\n- On-canvas type is a shock poster on every clip. Ultra-bold condensed sans-serif. Body words are white. Numbers, prices, and percents are mustard yellow. The payoff phrase is black type on a thick mustard-yellow dry-brush stroke, slightly tilted. Each clip pins that poster in one place: top, middle, or bottom. Neighbouring clips do not share the place. It stays pinned there for the whole clip. Not a white subtitle bar. Letters stay upright and sharp. Spell the spoken line exactly. Do not add a \"shock hook\" label.\n\n## Audio\n\nNo background music.\n\n## Phase A field mapping\n\n- `clipCount` follows the preset, with clip 1 reserved for the surprise. `loopMode` is always linear.\n- `hookStrategy`: the surprised close-up and the short hook line.\n- `coreMessage`: the concept in one line.\n- `narrativeArc`: surprise close-up → seated interview points → rest.\n- Each row: `narrativeJob` is `surprise` for clip 1 and `interview k of N` after that. `englishVo` is that clip's spoken line.\n\n## Workflow\n\n1. Read `references/surprise-proposal-contract.md` and produce Phase A.\n2. Stop and request explicit approval.\n3. Only after approval, read `references/surprise-prompt-contract.md` and produce Phase B, one prompt per clip.\n",
  "references": [
    {
      "path": "references/surprise-prompt-contract.md",
      "content": "# Surprise Interview Prompt Contract (Phase B)\n\nWrite one video prompt per approved clip. Do not start until Phase A is approved.\n\nEach prompt:\n\n1. Duration in this clip's own seconds, aspect ratio, and the one character speaking that line to the lens.\n2. First frame = this clip's start still. Last frame = this clip's end still.\n3. Clip 1: the person stays right-side up. The camera starts above and drops downward while it snaps a zoom-in. Sharp and clear. Do not flip the picture. The face moves into surprise.\n4. Clip 2 and after: hard cut. This clip's camera angle and body pose are different from the previous clip. Within the clip they stay locked. Only the mouth and expression move.\n5. On-canvas type is the shock poster: ultra-bold condensed sans, off-white words, mustard-yellow numbers, the payoff in black on a tilted yellow dry-brush stroke. Pin it for the whole clip at that clip's place: top, middle, or bottom. Neighbouring clips do not share the place. Letters stay upright. No subtitle bar. The spoken sentence is spelled exactly.\n6. No background music. No extra writing.\n"
    },
    {
      "path": "references/surprise-proposal-contract.md",
      "content": "# Surprise Interview Proposal Contract (Phase A)\n\nPresent a readable director's proposal and stop for confirmation before writing model prompts.\n\n## Header contract\n\n1. Title in the planning language and in English\n2. Total duration, clip count, loop mode: always Linear\n3. The concept in one line, and the surprise hook line\n4. Aspect ratio, the close-up for clip 1, and the seated interview setup for every later clip\n5. The one character speaks; each clip pins the shock poster at the top, the middle, or the bottom, and neighbours differ\n6. Cast lock: the one attached blueprint\n7. No music\n\n## Storyboard contract\n\n| Clip # & time | surprise / interview k of N | Start still | Motion, camera | Spoken line | SFX |\n|---|---|---|---|---|---|\n\nEvery clip is 5–12 seconds, set by its spoken line and pace. Clip 1 is the surprised close-up.\n\n## Scene detail\n\nWrite `startScene` and `endScene` as four concrete parts, in order:\n\n1. Character: expression, mouth, and eyeline. Never describe hair, face shape, or the blueprint outfit.\n2. Set: clip 1 is a plain background close to the face. Clip 2 onward is one chair and one background, repeated.\n3. Light: same direction and mood inside a clip. The interview clips share one light.\n4. Camera: clip 1 stays right-side up. It starts with the camera high above the head, looking down, and ends after the camera has dropped down and snapped a zoom-in on the surprised face. Head points to the top edge in both stills. Do not flip the picture. Each later clip picks a different angle (straight-on, low, high, or three-quarter) and a different body pose. Start and end of that clip share the angle and the pose.\n\nClip 2 and after are hard cuts. Do not copy the previous clip's angle or pose. Do not copy the overhead zoom.\n\n## Motion contract (`motionCamera`)\n\nTimed beats that fill this clip's seconds.\n\n- Clip 1: the person stays right-side up. The camera drops from above and snaps a zoom-in. Sharp and clear. Example: `0–0.15s hold the high start; 0.15–1.2s the camera drops from above and snaps a zoom-in, still right-side up, focus crisp; 1.2–3s hold the tight surprised face`.\n- Later clips: mouth speaks the line. Camera and body pose stay locked on this clip's own angle and pose. No cut inside the clip. The next clip changes both.\n\n## Phase A checks\n\n- Exactly one character.\n- Clip 1 is the only surprise hook.\n- Later clips each use a different camera angle and a different pose.\n- Every spoken line is on canvas as shock-poster type: off-white condensed sans, yellow numbers, the payoff on a mustard dry-brush stroke. Letters stay upright. No subtitle bar.\n- The last clip rests in the chair. No loop.\n"
    }
  ],
  "profile": {
    "bestFor": "Explaining one concept with a single character: a surprised close-up first, then a seated interview facing the camera.",
    "structure": "Clip 1 is a close-up of at least 5 seconds. Each later clip is 5–12 seconds, set by its spoken line and pace and covers one point. Clip count follows the duration preset.",
    "hook": "Opens with the camera above, then drops down and snaps a zoom-in on the surprised face. The person stays upright. Sharp and clear. One short hook line.",
    "arc": "After the surprise close-up, every later clip hard-cuts to a different camera angle and a different body pose. The last line rests.",
    "narrator": "Exactly one character speaks every line to the camera. A pasted script is read in order. A concept with no script becomes interview lines for you to approve.",
    "visual": "Look and palette come from the chosen visual style. Clip 1 stays upright: the camera starts above and drops down while zooming in. Each later clip uses a different angle and a different pose. On-canvas type is a shock poster pinned at the top, the middle, or the bottom, and neighbours do not share that place.",
    "audio": "No background music. Only the character's voice. The spoken line is the on-canvas shock type.",
    "rules": "Needs exactly one character and an aspect ratio. No second person and no screen recording. Clip 1 is always the surprise. Later clips each change the camera angle, the pose, and the subtitle place."
  },
  "behavior": {
    "keyframeMode": "start-only",
    "chainsClipStarts": true,
    "anchorsFramesToFirstClip": false,
    "dualBeat": false,
    "maxBackgroundSets": 4,
    "speechMode": "lip-sync",
    "bansNarration": true,
    "requiredCastCount": 1,
    "selfShotCreatorCamera": true,
    "forcesSceneText": false,
    "allowsInWorldLabels": false,
    "attachesTextStyleReference": false,
    "requiresSpokenScript": false,
    "allowsRoomBackgroundUpload": false,
    "allowsOpeningPhotoUpload": false,
    "allowsBrandLogoUpload": false,
    "maxStyleCount": 1,
    "hiddenInPicker": true
  }
} as const;

// Hardcoded director definition for "surprise-interview-director".
export const surpriseInterviewDirector: IDirector = {
  _id: "6ac3a9a18eb5511915a38e00",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-05T13:43:59.996Z"),
  updatedAt: new Date("2026-10-16T07:54:16.571Z"),
};
