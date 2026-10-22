import type { IDirector } from "@/model/director";

const raw = {
  "slug": "ending-director",
  "title": "Ending",
  "description": "A single 3–4 second closer: the frame settles on the brand logo as the last beat.",
  "sortOrder": 8,
  "isActive": true,
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/ending-director-preview-8affd4fb58.webp",
  "inputSchema": {
    "requiresSource": true,
    "aspectRatios": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "durationPresets": [
      "micro"
    ],
    "optionalCharacterImage": true
  },
  "higgsfieldDefaults": {
    "imageModel": "alibaba/qwen-image-3/text-to-image",
    "imageQuality": "medium",
    "imageResolution": "1k",
    "videoModel": "minimax/h3/image-to-video"
  },
  "systemPrompt": "---\nname: directing-ending-stings\ndescription: Use when making a 3–4 second ENDING brand sting (outro bumper) that closes a video — the scene resolves onto the brand logo as the final resting card in one single clip.\n---\n\n# Directing Ending Stings\n\n## Core contract\n\nTurn the brief into a confirmed director's proposal (Phase A) and then ONE video prompt (Phase B). An ending is exactly **one clip, 3–4 seconds long**. There is no length choice, no story, and no explainer beat: the only job is to close the video on the brand.\n\n## Setup gate\n\nRequire these before planning:\n\n- source material: the brand or product name, and optionally a CTA, tagline, or mood\n- aspect ratio: `16:9`, `9:16`, or `1:1`\n- optional: the brand logo image (attached as the last reference image)\n- optional: cast / character reference images (a mascot)\n\nIf required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.\n\n## Visual world\n\nThe rendering rules (canvas, look, palette, and motion) come from the **Visual style** block appended below this skill. Do not invent a different medium. Lettering comes only from the selected text style, never from the visual style or from this skill.\n\n- **Logo lock (when a logo is attached)**: the logo is the final card. Reproduce it exactly — same shapes, colours, and lettering. Never redraw, restyle, translate, crop, or invent a different wordmark. Name the logo, its placement, and its size in `startScene` and `endScene`.\n- **No logo attached**: close on the brand or product name from the source as title lettering in the selected text style. Do not copy typography from the visual style.\n- **Cast lock**: if a mascot blueprint is attached, it may wave goodbye or step aside for the logo, but it must follow the blueprint exactly.\n- One calm canvas. Few elements. The end still is clean enough to hold as a last frame.\n\n## Ending architecture\n\n1. **Start still**: the closing beat — props gathering, a mascot finishing a gesture, or shapes converging toward the centre. The logo may be partly visible.\n2. **One move (3–4s)**: everything resolves into the logo — gather and settle, zoom-out to the card, fade of props, or a stamp-in.\n3. **End still**: the full logo centered on a calm canvas, optionally with one short CTA line if the source gives one. This is the final frame of the whole video.\n\n## Audio\n\n- At most ONE short spoken line (≤ 6 English words / ≤ 10 Chinese characters) such as a sign-off or CTA, or `(no dialogue)`.\n- No background music. One soft resolving SFX (chime, pop, stamp) synced to the logo landing.\n\n## Phase A field mapping\n\n- `clipCount`: always 1. `targetDuration`: the clip length (3–4s). `loopMode`: always linear.\n- `hookStrategy`: the resolve device in one sentence.\n- `coreMessage`: the sign-off or CTA in a few words.\n- `narrativeArc`: \"closing beat → resolve → logo card at rest\".\n- `visualWorld`: the canvas and the few shapes or props that resolve into the logo.\n- The single clip row: `narrativeJob` = \"ending sting\"; `startScene` / `endScene` follow the architecture above; `motionCamera` = one timed move (`0–3s …; 3–4s settle`); `englishVo` = the short line or `(no dialogue)`; `bgmSfx` = the resolve SFX.\n\n## Workflow\n\n1. Read `references/ending-proposal-contract.md` and produce Phase A in the planning language given below, the spoken line in the chosen voiceover language.\n2. Stop and request explicit approval.\n3. Only after approval, read `references/ending-prompt-contract.md` and produce the single Phase B prompt.\n\n## Output rules\n\n- Exactly one clip, 3–4 seconds.\n- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.\n- No subtitles or captions beyond the logo / title lettering and one optional CTA line.\n- End on the logo card at rest; never loop back to the start.\n",
  "references": [
    {
      "path": "references/ending-prompt-contract.md",
      "content": "# Ending Clip Prompt Contract (Phase B)\n\nUse only after explicit approval of the current Phase A. Write ONE self-contained video prompt.\n\n## Prompt order\n\n1. Output spec: duration in seconds (3–4), aspect ratio, synchronized audio.\n2. Style lock: the canvas, look and negatives from the Visual style block in one sentence.\n3. Logo lock: the logo follows the START and END keyframes exactly — same shapes, colours, lettering. Never redraw or morph it into a different mark.\n4. Scene at t=0: the closing beat in the START keyframe.\n5. The one resolve move, timed across the full duration, landing on the END keyframe logo card.\n6. Camera: still, or one gentle zoom-out. No cuts.\n7. Audio: the short line quoted exactly once, or silence; one resolve SFX; no background music.\n8. Handoff: the logo card at rest — this is the last frame of the video. Never loop.\n9. Negatives: no extra text, no wrong spelling, no logo distortion, no style drift.\n\n## Dual-keyframe rule\n\nStart and end keyframes are the SAME SHOT. Interpolate across the full duration; never hold the start and snap to the end in the last frames.\n"
    },
    {
      "path": "references/ending-proposal-contract.md",
      "content": "# Ending Proposal Contract (Phase A)\n\nPresent a readable director's proposal and stop for confirmation before writing the model prompt.\n\n## Header contract\n\n1. Title in the reference language and in English\n2. Duration (3–4s), clip count 1, loop mode: always Linear\n3. Sign-off / CTA and the resolve device\n4. Aspect ratio, canvas, logo placement and size on the final card\n5. Spoken line (or none) and the resolve SFX\n6. Logo lock: attached logo exactly, or title lettering of the brand name\n\n## Storyboard contract\n\n| Clip # & time | Ending sting | Start still | Resolve move & settle | VO | SFX |\n|---|---|---|---|---|---|\n\nExactly ONE row.\n\n## Scene detail\n\nWrite `startScene` and `endScene` as four concrete parts, in order:\n\n1. Logo: where it is, how big, and how complete (partial / converging / full card).\n2. Set: canvas and the one or two simple shapes, props, or mascot pose around it.\n3. Light: direction and mood; identical in start and end.\n4. Camera: shot size and framing; identical in start and end unless the move is a zoom-out.\n\n## Motion contract (`motionCamera`)\n\nOne timed move that fits 3–4 seconds, e.g. `0–3s the props slide inward and fold into the logo; 3–4s the logo settles at centre`. Every difference between the start and end still must be caused on camera in that move. No cuts.\n\n## Phase A checks\n\n- Exactly one clip, 3–4 seconds.\n- The end still is the final logo card, readable and at rest.\n- With a logo attached, nothing redraws or invents the logo.\n- No technical colour notation.\n"
    }
  ],
  "profile": {
    "bestFor": "A short brand outro that closes your video on the brand logo, optionally with a call to action or sign-off.",
    "structure": "Always a single 3–4 second clip. The length can't be changed and there is no story.",
    "hook": "One single resolving move: props gather and settle into the logo, the camera zooms out to the logo card, props fade away, or the logo stamps in.",
    "arc": "Closing beat (props converging or a mascot finishing a gesture) → everything resolves → the logo card holds as the very last frame of your video.",
    "narrator": "Usually no voice; at most one very short spoken sign-off or call to action. An attached mascot can wave goodbye or move aside to make room for the logo.",
    "visual": "Look and palette come from the chosen visual style. A calm canvas with few elements, clean enough to hold as the last frame. An attached logo is reproduced exactly; without one, the brand name appears as title lettering, with one optional short CTA line.",
    "audio": "No background music — one soft resolving sound (chime, pop or stamp) synced to the logo landing.",
    "rules": "Exactly one 3–4 second clip. An attached logo is never redrawn, restyled or cropped. No subtitles beyond the logo or title and one optional CTA line, and it ends on the logo card without looping back."
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
    "bookendRole": "ending",
    "requiresSpokenScript": false,
    "allowsRoomBackgroundUpload": false,
    "allowsOpeningPhotoUpload": false,
    "allowsBrandLogoUpload": true,
    "hiddenInPicker": false
  }
} as const;

// Hardcoded director definition for "ending-director".
export const endingDirector: IDirector = {
  _id: "6abe134cebdb844ee2ce5b52",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-01T08:01:15.930Z"),
  updatedAt: new Date("2026-10-16T07:54:15.699Z"),
};
