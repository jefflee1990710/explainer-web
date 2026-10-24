import type { IDirector } from "@/model/director";

const raw = {
  "slug": "outfit-change-director",
  "title": "Outfit change",
  "description": "Same empty white room and locked camera. Each clip hard-cuts to a new complete look.",
  "sortOrder": 16,
  "isActive": true,
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/outfit-reel-director-preview-1bcd6983e1.webp",
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
  "systemPrompt": "---\nname: directing-outfit-change-reels\ndescription: Use when one character stays in the same empty white room on a locked camera, and each clip hard-cuts to a new complete outfit. No voiceover and no music.\n---\n\n# Directing Outfit Change Reels\n\n## Core contract\n\nTurn clothing reference images into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. Each clip is already dressed in that clip's complete look. Do not put clothes on.\n\nEach clip is 5 seconds. Clip count follows the duration preset. Prefer one clothing photo per clip. If the brief asks buttoned or unbuttoned of the same piece, alternate those two styling variants.\n\n## Setup gate\n\nRequire these before planning:\n\n- one or more clothing reference images (one complete look per photo)\n- aspect ratio: `16:9`, `9:16`, or `1:1` (prefer `9:16` when the user has not chosen)\n- exactly one character blueprint\n\nIf no clothing reference is attached, ask for the photos and stop. Never invent garments from the brief sentence.\n\n## Clothes\n\nCopy the clothing photo assigned to that clip 100 percent: every piece, same style, cut, colour, pattern, and details. Do not redesign, recolor, drop, or add a piece. Face, hair, and body proportions stay on the character blueprint. Never copy the person, face, hair, tattoos, pose, or room in a clothing photo. Only the clothes change. The next clip is a different complete look, not a camera move on the same outfit.\n\n## Shot plan\n\n- One empty cream-white room. Plain wall. No furniture, no window props, no shelf.\n- The camera is locked for the whole video: eye-level three-quarter, waist-up to mid-thigh, centered, same crop, same subject size. No gimbal rotation, no push, no zoom.\n- She stays planted, calm editorial expression, soft closed mouth, eyes to camera. One small breath or weight shift only. She does not walk, spin, bounce, or dress.\n- The next clip is a hard cut to the next complete look. Same room. Same camera.\n\n## Words and audio\n\n- `englishVo` is `(no dialogue)` on every clip. No voiceover, no spoken line, no narrator, no subtitle.\n- No background music. One sound effect per clip (a soft whoosh or cloth snap).\n\n## Phase A field mapping\n\n- `hookStrategy`: already dressed in look 1, empty white room, locked camera.\n- `coreMessage`: a lookbook of complete outfits, one look per clip.\n- `narrativeArc`: hard-cut look swaps in the same room.\n- `narrativeJob`: `Look N` or `Look N (buttoned|unbuttoned)`.\n- `englishVo` is `(no dialogue)`.\n- `bgmDirection` and every `bgmSfx` say no music and name one sound effect.\n\n## Workflow\n\n1. Read `references/outfit-change-proposal-contract.md` and produce Phase A.\n2. Stop and request explicit approval.\n3. Only after approval, read `references/outfit-change-prompt-contract.md` and produce Phase B, one prompt per clip.\n",
  "references": [
    {
      "path": "references/outfit-change-prompt-contract.md",
      "content": "# Outfit Change Prompt Contract (Phase B)\n\nWrite one video prompt per approved clip. Do not start until Phase A is approved.\n\nEach prompt:\n\n1. Duration 5 seconds, aspect ratio, waist-up to mid-thigh, locked camera.\n2. First frame = this clip's start still. Last frame = the same look, same pose, same room, same locked camera.\n3. Do not put clothes on or take clothes off. Do not change style or colour during the clip. She stays planted and does not walk or spin.\n4. Face, hair, and body proportions stay as in the frames. Do not copy a person from a clothing photo.\n5. No spoken line. No voiceover. No narrator. No lip-sync.\n6. No background music. One sound effect, matching the approved `bgmSfx`.\n7. No subtitles. The next clip is a hard cut to a different complete look.\n"
    },
    {
      "path": "references/outfit-change-proposal-contract.md",
      "content": "# Outfit Change Proposal Contract (Phase A)\n\nPresent a readable director's proposal and stop for confirmation before writing model prompts.\n\n## Outfit\n\n- Each clip is already wearing the complete look assigned to that clip. Do not write a dressing action.\n- Copy style, cut, colour, pattern, and details exactly from that clip's clothing photo. Name the reference id. Do not add pieces the photo does not show.\n- Face, hair, and proportions stay on the character blueprint. Do not copy the person in the clothing photo.\n- The next clip is a different complete look, or a buttoned / unbuttoned styling variant of the same piece when the brief asks for that.\n\n## Header contract\n\n1. Title in the planning language and in English\n2. Total duration (sum of the 5s clips), clip count from the duration preset, loop mode: always Linear\n3. A lookbook of complete outfits\n4. Aspect ratio, the one empty cream-white room, and the one locked camera\n5. Cast lock: face and hair from the one attached blueprint; clothes come only from that clip's clothing reference\n6. No voiceover. No background music. One sound effect per clip\n7. The look list, one complete look per row\n\n## Storyboard contract\n\n| Clip # & time | Look | Outfit | Locked camera hold | VO | SFX |\n|---|---|---|---|---|---|\n\nEvery clip is 5 seconds. The outfit column is a different complete look on every row. VO is `(no dialogue)`.\n\n## Scene detail\n\nWrite `startScene` and `endScene` as four concrete parts, in order:\n\n1. Character: a planted standing pose in THIS clip's complete look. Do not describe hair or face. Do not put a garment in her hands.\n2. Set: the same empty cream-white room in every clip. Do not copy the room in the clothing photo.\n3. Light: the same soft even indoor daylight in every clip.\n4. Camera: locked eye-level three-quarter, waist-up to mid-thigh, centered. Same crop and same subject size on start and end.\n\n## Motion contract (`motionCamera`)\n\nTimed beats for a hold only. She is already dressed and stays planted. The camera does not move. One small breath or weight shift. Hard cut to the next look.\n\n## Auto\n\n- `englishVo` is `(no dialogue)` on every clip.\n- `bgmDirection` is no background music, sound effects only.\n- Each `bgmSfx` names one sound effect and says no voice and no music.\n\n## Phase A checks\n\n- Exactly one character.\n- Clip count follows the duration preset.\n- Every still shows that clip's complete look. No dressing.\n- Clothes match that clip's reference in style and colour. Only the character changes.\n- Same empty room. Same locked camera. A different look each clip.\n- Every clip is `(no dialogue)`. No background music.\n"
    }
  ],
  "profile": {
    "bestFor": "A lookbook reel: one character, one empty white room, a new complete outfit on every hard cut.",
    "structure": "Clip count follows the duration. Every clip is 5 seconds and one complete look. The camera never moves.",
    "hook": "Opens already dressed in look 1, empty cream-white room, locked camera. No title card and no dressing.",
    "arc": "Hard-cut look swaps. Same room, same crop, same planted pose. Only the clothes change.",
    "narrator": "No voiceover and no spoken line.",
    "visual": "Look and palette come from the chosen visual style. One empty cream-white room. Clothes match that clip's reference image. Face and hair stay on the blueprint.",
    "audio": "One sound effect per clip. No background music. No voice.",
    "rules": "Needs exactly one character and clothing reference images. Each clip is already dressed in that clip's look. Copy style and colour exactly. Locked camera. Same room. No voiceover. No background music."
  },
  "behavior": {
    "keyframeMode": "start-only",
    "chainsClipStarts": false,
    "anchorsFramesToFirstClip": false,
    "dualBeat": false,
    "maxBackgroundSets": 1,
    "speechMode": "silent",
    "bansNarration": false,
    "requiredCastCount": 1,
    "selfShotCreatorCamera": false,
    "forcesSceneText": false,
    "allowsInWorldLabels": false,
    "attachesTextStyleReference": false,
    "requiresSpokenScript": false,
    "allowsRoomBackgroundUpload": false,
    "allowsOpeningPhotoUpload": false,
    "allowsBrandLogoUpload": false,
    "hiddenInPicker": false
  }
} as const;

// Hardcoded director definition for "outfit-change-director".
export const outfitChangeDirector: IDirector = {
  _id: "6ac3a9a18eb5511915a38e03",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-24T09:00:00.000Z"),
  updatedAt: new Date("2026-10-24T09:00:00.000Z"),
};
