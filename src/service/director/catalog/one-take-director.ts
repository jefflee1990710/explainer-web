import type { IDirector } from "@/model/director";

const raw = {
  "slug": "one-take-director",
  "title": "One-take motion",
  "description": "Directs a single uninterrupted one-take continuous motion shot (up to 60 seconds in 1 clip) with zero voiceover and zero dialogue — pure physical movement, camera tracking, and ambient sound.",
  "suggestedUseCase": "Running down a mountain trail, continuous action sequences, skateboarding/parkour tracking shots, atmospheric long takes, and pure-motion kinematic reels.",
  "sortOrder": 3,
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
  "systemPrompt": "---\nname: directing-one-take-motion\ndescription: Use when filming a single uninterrupted one-take continuous action shot (up to 60 seconds in 1 clip) with no voiceover and no dialogue.\n---\n\n# Directing One-Take Motion (一鏡到底無旁白)\n\n## Core contract\n\nTurn one action and setting into a single-clip continuous long-take proposal (Phase A) and a single chained video prompt (Phase B). Produce **EXACTLY 1 CLIP (`clipCount = 1`)** whose `durationSeconds` spans the entire target duration (6 to 60 seconds: ~6–8s for micro, ~18s for short, ~36s for punchy, ~60s for full, or the exact duration requested by the user). There is **NO narrator, NO voiceover, and NO spoken dialogue** (`englishVo` is always `\"(no dialogue)\"`). All storytelling happens through continuous physical locomotion and uninterrupted camera tracking.\n\n## Continuous 6-second beat progression\n\nWrite `Clip 1.motionCamera` as sequential ~6-second continuous windows covering the full `durationSeconds` (e.g. `0–6s ...; 6–12s ...; 12–18s ...`). Each 6s window continues the exact momentum, camera trajectory, and terrain of the previous window with zero cuts.\n",
  "references": [
    {
      "path": "references/one-take-prompt-contract.md",
      "content": "# One-Take Motion Prompt Contract (Phase B)\n\nWrite ONE self-contained continuous long-take video prompt for Clip 1.\n\n1. Output spec: full `durationSeconds` (6–60s), aspect ratio, uninterrupted one-take tracking camera.\n2. First frame = Clip 1's start still. No end still.\n3. Sequential ~6-second continuous beats (`0–6s ...; 6–12s ...`) describing physical locomotion and camera tracking with zero cuts.\n4. Audio: `(no dialogue)`, no narrator, natural diegetic ambient sound and movement Foley only.\n"
    },
    {
      "path": "references/one-take-proposal-contract.md",
      "content": "# One-Take Motion Proposal Contract (Phase A)\n\nProduce EXACTLY 1 storyboard row (`Clip 1`) with `clipCount: 1` and `durationSeconds` between 6 and 60 seconds.\n\n- `narrator`: `\"No narrator — pure continuous motion and ambient sound.\"`\n- `englishVo`: `\"(no dialogue)\"`\n- `motionCamera`: sequential ~6-second continuous action & camera tracking windows across the full duration.\n"
    }
  ],
  "profile": {
    "bestFor": "Pure continuous physical motion (running downhill, sprinting, skating, walking through an environment) filmed in one uninterrupted long take up to 60 seconds with no VO.",
    "structure": "Always 1 single clip (`Clip 1`) spanning the entire 6–60s duration, broken into continuous 6-second motion progression beats.",
    "hook": "Opens immediately mid-action in the first frame with dynamic momentum and camera tracking.",
    "arc": "One uninterrupted continuous shot from start to finish — chained seamlessly via MiniMax H3 ref2va 39-frame latent prefix continuation.",
    "narrator": "No narrator and no dialogue (`(no dialogue)`). Mouth stays naturally closed.",
    "visual": "Continuous third-person tracking camera (gimbal follow, lead, or side-tracking shot) with authentic physical locomotion and zero cuts.",
    "audio": "Diegetic environmental ambience and movement Foley (footsteps, wind, terrain) with zero spoken words.",
    "rules": "Strictly 1 clip (`clipCount = 1`), zero invented props, zero voiceover, continuous camera motion up to 60 seconds."
  },
  "behavior": {
    "keyframeMode": "start-only",
    "chainsClipStarts": false,
    "anchorsFramesToFirstClip": false,
    "dualBeat": false,
    "maxBackgroundSets": 1,
    "speechMode": "silent",
    "bansNarration": true,
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
    "hiddenInPicker": false
  }
} as const;

// Hardcoded director definition for "one-take-director".
export const oneTakeDirector: IDirector = {
  _id: "6ad100000000000000000001",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-11-07T00:00:00.000Z"),
  updatedAt: new Date("2026-11-07T00:00:00.000Z"),
};
