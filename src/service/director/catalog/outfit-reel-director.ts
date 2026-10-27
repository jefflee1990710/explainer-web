import type { IDirector } from "@/model/director";

const raw = {
  "slug": "outfit-reel-director",
  "title": "Outfit reel",
  "description": "Showcases one character already dressed in the complete outfit from your reference image across dynamic camera rotations and angles, accompanied by foley sound effects only.",
  "suggestedUseCase": "Single-look fashion showcases, OOTD (Outfit of the Day) reels, apparel product pages, virtual model lookbooks, and streetwear/luxury garment highlights.",
  "sortOrder": 14,
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
  "systemPrompt": "---\nname: directing-outfit-reels\ndescription: Use when one character is already wearing the clothes from a reference image, and each clip is a different camera move. No voiceover and no music.\n---\n\n# Directing Outfit Reels\n\n## Core contract\n\nTurn the clothes in the reference images into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. She is already dressed in the complete reference outfit from the first frame of clip 1 through the last frame. Do not put clothes on.\n\nEach clip is 5–12 seconds. With no spoken line, durationSeconds is 5. Clip count follows the duration preset. Do not add a clip per garment.\n\n## Setup gate\n\nRequire these before planning:\n\n- one or more clothing reference images\n- aspect ratio: `16:9`, `9:16`, or `1:1` (prefer `9:16` when the user has not chosen)\n- exactly one character blueprint\n\nIf no clothing reference is attached, ask for the photos and stop. Never invent garments from the brief sentence.\n\n## Clothes\n\nCopy the clothing photos 100 percent: every piece, same style, cut, colour, pattern, and details. Do not redesign, recolor, drop, or add a piece. Face, hair, and body proportions stay on the character blueprint. Never copy the person, face, hair, tattoos, pose, or room in a clothing photo. Only the character changes.\n\n## Shot plan\n\n- One room. The outfit does not change.\n- Each clip is one camera rotation. The start still and the end still share the same pose, the same room, the same distance, and the same subject size. Only the camera angle changes. Head and shoes stay in frame. The move is one slow gimbal rotation. No push, no zoom, no handheld shake, no whip, and no jump inside a clip.\n- Default order, shuffled each time you plan so two clips in a row are not the same rotation:\n  - left to right\n  - top to bottom\n  - right to left\n  - bottom to top\n- She stays planted, feet still, bright smile, no bounce. She does not dress, and she does not turn her body to follow the lens.\n- The next clip is a hard cut to a different move.\n\n## Words and audio\n\n- `englishVo` is `(no dialogue)` on every clip. No voiceover, no spoken line, no narrator, no subtitle.\n- No background music. One sound effect per clip.\n\n## Phase A field mapping\n\n- `hookStrategy`: the complete reference outfit, already on.\n- `coreMessage`: the finished look in a few words.\n- `narrativeArc`: the same outfit, seen through different camera moves.\n- `narrativeJob`: the camera move for that clip.\n- `englishVo` is `(no dialogue)`.\n- `bgmDirection` and every `bgmSfx` say no music and name one sound effect.\n\n## Workflow\n\n1. Read `references/outfit-proposal-contract.md` and produce Phase A.\n2. Stop and request explicit approval.\n3. Only after approval, read `references/outfit-prompt-contract.md` and produce Phase B, one prompt per clip.\n",
  "references": [
    {
      "path": "references/outfit-prompt-contract.md",
      "content": "# Outfit Reel Prompt Contract (Phase B)\n\nWrite one video prompt per approved clip. Do not start until Phase A is approved.\n\nEach prompt:\n\n1. Duration 5–12 seconds (5 when there is no spoken line), aspect ratio, full body, head to shoes.\n2. First frame = this clip's start still. Last frame = this clip's end still. The camera rotates slowly from the start angle to the end angle on one axis. Same pose, same distance, same subject size. No push, no zoom, no handheld shake, no whip, and no jump. The outfit is identical in both frames.\n3. Do not put clothes on or take clothes off. Do not change style or colour. She stays planted and does not turn to follow the lens.\n4. Face, hair, and body proportions stay as in the frames. Do not copy a person from a clothing photo.\n5. No spoken line. No voiceover. No narrator. No lip-sync.\n6. No background music. One sound effect, matching the approved `bgmSfx`.\n7. No subtitles. No step numbers.\n"
    },
    {
      "path": "references/outfit-proposal-contract.md",
      "content": "# Outfit Reel Proposal Contract (Phase A)\n\nPresent a readable director's proposal and stop for confirmation before writing model prompts.\n\n## Outfit\n\n- She is already wearing every garment in the clothing reference images, from clip 1 through the last clip. Do not write a dressing action.\n- Copy style, cut, colour, pattern, and details exactly. Name the reference ids. Do not add pieces the photos do not show.\n- Face, hair, and proportions stay on the character blueprint. Do not copy the person in the clothing photo.\n\n## Header contract\n\n1. Title in the planning language and in English\n2. Total duration (sum of the 3–4s clips), clip count from the duration preset, loop mode: always Linear\n3. The finished look in a few words\n4. Aspect ratio, the one room, and a different camera move on every clip\n5. Cast lock: face and hair from the one attached blueprint; clothes come only from the clothing references\n6. No voiceover. No background music. One sound effect per clip\n7. The camera-move list, with the same complete outfit on every row\n\n## Storyboard contract\n\n| Clip # & time | Camera move | Outfit | The camera travel | VO | SFX |\n|---|---|---|---|---|---|\n\nEvery clip is 5–12 seconds (5 when there is no spoken line). The outfit column is the same complete reference look on every row. VO is `(no dialogue)`.\n\n## Scene detail\n\nWrite `startScene` and `endScene` as four concrete parts, in order:\n\n1. Character: a planted standing pose in the complete reference outfit. Do not describe hair or face. Do not put a garment in her hands.\n2. Set: the same room in every clip. Do not copy the room in the clothing photo.\n3. Light: the same light in every clip.\n4. Camera: the start still is the beginning of this clip's one rotation. The end still is where that rotation lands. Same pose, same room, same distance, and same subject size. Head and shoes stay in frame.\n\n## Motion contract (`motionCamera`)\n\nTimed beats for the camera only. She is already dressed and stays planted in the same pose. The move is one slow gimbal rotation for the whole clip. Same distance and same subject size. No push, no zoom, no handheld shake, no whip, and no jump.\n\nAssign these rotations, a different one on every clip, and a new shuffle each time you plan. The default order is:\n\n- left to right\n- top to bottom\n- right to left\n- bottom to top\n\n## Audio\n\n- `englishVo` is `(no dialogue)` on every clip.\n- `bgmDirection` is no background music, sound effects only.\n- Each `bgmSfx` names one sound effect and says no voice and no music.\n\n## Phase A checks\n\n- Exactly one character.\n- Clip count follows the duration preset, not the number of garments.\n- Every still shows the complete reference outfit. No dressing.\n- Clothes match the reference in style and colour. Only the character changes.\n- Same room. A different camera move each clip. No flash cuts inside a clip.\n- Every clip is `(no dialogue)`. No background music.\n"
    }
  ],
  "profile": {
    "bestFor": "Showing one character already wearing the full outfit from a reference image, with a different camera move on every clip.",
    "structure": "Clip count follows the duration. Every clip is the same complete outfit. Each clip is one 5–12 second camera rotation (5 when there is no spoken line), shuffled from left-to-right, top-to-bottom, and the two reverse rotations.",
    "hook": "Opens already dressed in the reference outfit. No title card and no dressing.",
    "arc": "The same look and the same planted pose. Each clip rotates the camera on one axis: left to right, top to bottom, right to left, or bottom to top.",
    "narrator": "No voiceover and no spoken line.",
    "visual": "Look and palette come from the chosen visual style. One room. Clothes match the reference image in style and colour. Face and hair stay on the blueprint. Only the character changes.",
    "audio": "One sound effect per clip. No background music. No voice.",
    "rules": "Needs exactly one character and clothing reference images. The outfit is already on from clip 1. Copy style and colour exactly. One camera rotation per clip, in a new random order each time. Same pose and same subject size inside a clip. No voiceover. No background music."
  },
  "behavior": {
    "keyframeMode": "start-only",
    "chainsClipStarts": false,
    "anchorsFramesToFirstClip": false,
    "dualBeat": false,
    "maxBackgroundSets": 4,
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
    "maxStyleCount": 1,
    "hiddenInPicker": true
  }
} as const;

// Hardcoded director definition for "outfit-reel-director".
export const outfitReelDirector: IDirector = {
  _id: "6ac3a9a18eb5511915a38e01",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-05T13:44:01.398Z"),
  updatedAt: new Date("2026-10-16T07:54:16.744Z"),
};
