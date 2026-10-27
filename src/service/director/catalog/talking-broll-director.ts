import type { IDirector } from "@/model/director";

const raw = {
  "slug": "talking-broll-director",
  "title": "Talking-head with B-roll",
  "description": "Alternates between an on-camera speaker close-up (two spoken lines) and an illustrative B-roll cutaway showing what was just described, before returning to the exact same speaker setup.",
  "suggestedUseCase": "Storytelling commentary, news & tech recaps, case study breakdowns, educational vlogs, and creator videos that blend face-to-camera trust with visual proof.",
  "sortOrder": 12,
  "isActive": true,
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/talking-broll-director-preview-e3fa049bf3.webp",
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
  "systemPrompt": "---\nname: directing-talking-head-broll\ndescription: Use when one character speaks to camera, cuts away to a picture of what they just said, then returns to the same close-up.\n---\n\n# Directing Talking-Head with B-roll\n\n## Core contract\n\nTurn one source into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). The rhythm is fixed: two on-camera lines, one B-roll cutaway, then back to the same close-up. Repeat until the source is covered.\n\n## Setup gate\n\nRequire these before planning:\n\n- source material (notes or a script)\n- aspect ratio: `16:9`, `9:16`, or `1:1`\n- exactly one character blueprint (the face that speaks)\n\nIf required items are missing, ask for them in one concise message and stop.\n\n## Rhythm\n\n- `narrativeJob` is only `on-camera` or `b-roll`.\n- Never open on B-roll.\n- On-camera: medium close-up, eyes to the lens, same background and light as the first on-camera clip. The character speaks `englishVo`.\n- B-roll: the character is not in frame. Show the concrete thing the previous two lines named. `englishVo` is one short off-screen line or `(no dialogue)`.\n- The on-camera clip after a B-roll returns to the first setup. It does not continue the B-roll room.\n- The last clip is on-camera and rests.\n\n## Inheritance\n\nA B-roll clip does not inherit the talking-head room. The next speech clip does not inherit the B-roll. Speech clips inherit only from the first on-camera setup.\n\n## Workflow\n\n1. Read `references/broll-proposal-contract.md` and produce Phase A.\n2. Stop for approval.\n3. After approval, read `references/broll-prompt-contract.md` and produce Phase B.\n",
  "references": [
    {
      "path": "references/broll-prompt-contract.md",
      "content": "# Talking-Head B-roll Clip Prompt Contract (Phase B)\n\nOne prompt per approved clip.\n\n1. Duration 5–12 seconds, from the spoken line and pace and aspect ratio.\n2. Style lock from the Visual style block.\n3. If `narrativeJob` is `on-camera`: the attached character, medium close-up, eyes to the lens, the locked background. They speak the line once.\n4. If `narrativeJob` is `b-roll`: no character. Show the subject. Quote an off-screen line once, or state no dialogue.\n5. Timed beats inside the shot. Name the cut at the boundary: from the face, or back to the face.\n6. No background music.\n7. The last prompt rests on the face. No loop.\n\nColours in ordinary words only. Do not restyle the character.\n"
    },
    {
      "path": "references/broll-proposal-contract.md",
      "content": "# Talking-Head B-roll Proposal Contract (Phase A)\n\n## Header\n\n1. Titles in the reference language and in English\n2. Duration, clip count, loop mode: always Linear\n3. The promise of the talk\n4. The locked close-up (shot size, background, light) used by every on-camera clip\n5. Cast lock: the one attached blueprint\n\n## Storyboard\n\nAlternate `on-camera`, `on-camera`, `b-roll`, and repeat.\n\n- On-camera `explainerScene`: the same close-up every time. Pose and mouth may change. Do not add a new set.\n- B-roll `explainerScene`: a new place, no speaker. One concrete subject.\n- `motionCamera`: timed beats inside that shot. A B-roll clip may hard-cut in from the face; say so. The following on-camera clip hard-cuts back.\n\n## Counts\n\nOne cycle is two speech clips plus one cutaway. A short piece adds one return line so it ends on the face.\n\n- **4–8s micro**: one cycle, 3–4 clips, shorter lines\n- **15–20s**: 4–6 clips\n- **30–45s**: 6–9 clips\n- **50–60s**: 8–12 clips\n\nEnd on an on-camera clip. No loop.\n"
    }
  ],
  "profile": {
    "bestFor": "A person speaking to camera who cuts away to the thing they just named, then comes back — explainers that should not stay on a face.",
    "structure": "Fixed rhythm: two on-camera lines, one B-roll cutaway, then back. Repeat. Each clip is 5–12 seconds, set by the spoken line and pace. Micro can be one cycle (talk, talk, cutaway, return).",
    "hook": "Opens on the face saying the strongest line. Never opens on B-roll or a title card.",
    "arc": "Pairs of spoken lines, each pair paid off by one cutaway of what they named, then the same close-up returns. The last clip is on-camera and rests.",
    "narrator": "The attached character speaks the on-camera lines to the lens. A B-roll clip may carry one short off-screen line or stay silent.",
    "visual": "Look and palette come from the chosen visual style. On-camera is one locked medium close-up. B-roll is a new place and does not show the speaker.",
    "audio": "No background music. The voice continues across the cutaway when a line is written; silent cutaways use one sound effect tied to the picture.",
    "rules": "Needs exactly one character. Do not stay on the face for the whole video. After B-roll, return to the first on-camera setup, not the cutaway."
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

// Hardcoded director definition for "talking-broll-director".
export const talkingBrollDirector: IDirector = {
  _id: "6ac1fde88eb5511915a27fd8",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-04T07:19:03.935Z"),
  updatedAt: new Date("2026-10-16T07:54:16.398Z"),
};
