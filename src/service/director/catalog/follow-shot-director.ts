import type { IDirector } from "@/model/director";

const raw = {
  "slug": "follow-shot-director",
  "title": "Follow shot",
  "description": "Films one character in a continuous third-person locked camera shot where each clip's start frame seamlessly continues from the previous clip's end frame as the action unfolds.",
  "suggestedUseCase": "Cinematic character walks, atmospheric B-roll sequences, physical action progressions, ambient storytelling reels, and seamless motion loops.",
  "sortOrder": 15,
  "isActive": true,
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/follow-shot-director-preview-9e94db7569.webp",
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
  "systemPrompt": "---\nname: directing-follow-shots\ndescription: Use when one character is filmed in a continuous third-person shot, split into clips where each start is the previous end.\n---\n\n# Directing Follow Shots\n\n## Core contract\n\nTurn a place and an action into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). Exactly one character. The video is one third-person action split into clips. It is not a new angle every clip.\n\nEach clip is 5–12 seconds, or 5 seconds when there is no dialogue. Clip count follows the duration preset. The camera stays locked. The character takes a few steps, turns, or makes one gesture. The background shifts only a little. A street that scrolls past the lens is out of scope.\n\n## Setup gate\n\nRequire these before planning:\n\n- where the character is\n- what they are doing (walking, crossing a room, turning to look)\n- aspect ratio: `16:9`, `9:16`, or `1:1` (prefer `9:16` when the user has not chosen)\n- exactly one character blueprint\n\nIf the place or the action is missing, ask in one concise message and stop.\n\n## Shot plan\n\n- Third person. The character lives in the scene. A glance toward the lens is allowed; this is not an interview and not a close-up read.\n- Clip 1 opens already in motion. No title card.\n- From clip 2 on, `startScene` copies the previous clip's `endScene`: same place, same clothes, same camera angle, same body position.\n- Inside a clip, one small beat only. A few steps, one turn, or one gesture. The character stays a similar size. Do not replace the background.\n- Clothes stay as they are. No costume change.\n- The last clip stops and rests. No whip pan and no jump to a new setup.\n\n## Words and audio\n\n- No narrator. Default `englishVo` is `(no dialogue)`.\n- If the user wrote one short line, use it on one clip only.\n- Silent clips have no subtitle.\n- Ambient sound or light music, plus one footstep or room sound per clip.\n\n## Phase A field mapping\n\n- `hookStrategy`: already mid-action in the named place.\n- `coreMessage`: the action in a few words.\n- `narrativeArc`: continuous third-person beats, then a rest.\n- Each row: `narrativeJob` = the beat (`walk`, `turn`, `gesture`, `rest`).\n- `englishVo` is `(no dialogue)` unless the user supplied one short line.\n\n## Workflow\n\n1. Read `references/follow-proposal-contract.md` and produce Phase A.\n2. Stop and request explicit approval.\n3. Only after approval, read `references/follow-prompt-contract.md` and produce Phase B, one prompt per clip.\n",
  "references": [
    {
      "path": "references/follow-prompt-contract.md",
      "content": "# Follow Shot Prompt Contract (Phase B)\n\nWrite one video prompt per approved clip. Do not start until Phase A is approved.\n\nEach prompt:\n\n1. Duration in this clip's own seconds (5–12), aspect ratio, third-person, locked camera.\n2. First frame = this clip's start still. Last frame = this clip's end still. From clip 2 on, the first frame is the previous clip's last frame.\n3. One beat: a few steps, a turn, or one gesture. The character stays a similar size. The background shifts only a little.\n4. Clothes stay as in the frames. No new angle and no cut.\n5. The last clip ends with the character stopped.\n6. One footstep or room sound. No narrator. No subtitle when `englishVo` is `(no dialogue)`.\n"
    },
    {
      "path": "references/follow-proposal-contract.md",
      "content": "# Follow Shot Proposal Contract (Phase A)\n\nPresent a readable director's proposal and stop for confirmation before writing model prompts.\n\n## Header contract\n\n1. Title in the planning language and in English\n2. Total duration, clip count, each clip 5–12 seconds, loop mode: always Linear\n3. The place and the action\n4. Aspect ratio and the one locked third-person camera\n5. Cast lock: the one attached blueprint, clothes unchanged\n6. No narrator\n7. The beats mapped to clips\n\n## Storyboard contract\n\n| Clip # & time | walk / turn / gesture / rest | Start still | The one beat | VO | SFX |\n|---|---|---|---|---|---|\n\n## Scene detail\n\nWrite `startScene` and `endScene` as four concrete parts, in order:\n\n1. Character: pose, facing, and feet. Never describe hair, face, or outfit. One instance of the character.\n2. Set: the same place. Name one or two fixed landmarks so the background can shift only a little.\n3. Light: the same light in every clip.\n4. Camera: locked third-person, similar shot size, character at a similar screen size.\n\nClip 2 and after: `startScene` copies the previous `endScene`.\n\n## Motion contract (`motionCamera`)\n\nOne timed beat. The character moves a short distance or turns. The camera does not cut and does not become a new angle.\n\nExample: `0–4s three steps toward the lens, background shifts slightly, camera locked; 4–5s weight settles`.\n\nThe last clip ends stopped. No loop.\n\n## Phase A checks\n\n- Exactly one character.\n- Every clip after the first opens on the previous end still.\n- Same camera angle for the whole video.\n- Background landmarks stay recognizable.\n- Clothes do not change.\n- Silent clips use `(no dialogue)`.\n- The last clip rests. No whip pan and no new setup.\n"
    }
  ],
  "profile": {
    "bestFor": "A third-person continuous shot of one character already in motion, split into clips that keep going without a new angle.",
    "structure": "Each clip is 5–12 seconds, or 5 seconds when there is no dialogue. Count follows the duration preset: about 1–2 for a micro, 2–4 for 15–20s, 4–6 for 30–45s, and 7–10 for 50–60s.",
    "hook": "Opens mid-action, already walking or moving through the place you name. No title card.",
    "arc": "One continuous third-person action. From clip 2 on, the start still is the previous clip's end still: same place, clothes, camera, and body position. Each clip adds a few steps, a turn, or one gesture. The last clip stops and rests.",
    "narrator": "No narrator. The clip stays silent unless you wrote one short line.",
    "visual": "Look and palette come from the chosen visual style. A locked third-person camera, one location, and one character at a similar size. The background shifts only a little. Clothes stay as they are.",
    "audio": "Ambient sound or light music, plus one footstep or room sound per clip. Silent clips have no subtitle.",
    "rules": "Needs exactly one character, a place, and the action. Because each start matches the previous end, the angle does not change between clips. No whip pans, no new setup, and no crowd as a required element."
  },
  "behavior": {
    "keyframeMode": "start-only",
    "chainsClipStarts": true,
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

// Hardcoded director definition for "follow-shot-director".
export const followShotDirector: IDirector = {
  _id: "6ac3a9a18eb5511915a38e02",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-05T13:44:01.538Z"),
  updatedAt: new Date("2026-10-16T07:54:16.917Z"),
};
