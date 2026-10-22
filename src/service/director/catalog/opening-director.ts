import { ObjectId } from "mongodb";
import type { IDirector } from "@/model/director";

const raw = {
  "slug": "opening-director",
  "title": "Opening",
  "description": "A single 3–4 second bumper: the brand logo enters and holds, placed before the main video.",
  "sortOrder": 7,
  "isActive": true,
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/opening-director-preview-40cb80e51d.webp",
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
  "systemPrompt": "---\nname: directing-opening-stings\ndescription: Use when making a 3–4 second OPENING brand sting (intro bumper) that plays before a main video — the brand logo arrives and settles in one single clip.\n---\n\n# Directing Opening Stings\n\n## Core contract\n\nTurn the brief into a confirmed director's proposal (Phase A) and then ONE video prompt (Phase B). An opening is exactly **one clip, 3–4 seconds long**. There is no length choice, no story, and no explainer beat: the only job is to introduce the brand before the main video starts.\n\n## Setup gate\n\nRequire these before planning:\n\n- source material: the brand or product name, and optionally a tagline or mood\n- aspect ratio: `16:9`, `9:16`, or `1:1`\n- optional: the brand logo image (attached as the last reference image)\n- optional: cast / character reference images (a mascot)\n\nIf required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.\n\n## Visual world\n\nThe rendering rules (canvas, look, palette, and motion) come from the **Visual style** block appended below this skill. Do not invent a different medium. Lettering comes only from the selected text style, never from the visual style or from this skill.\n\n- **Logo lock (when a logo is attached)**: the logo is the hero of the sting. Reproduce it exactly — same shapes, colours, and lettering. Never redraw, restyle, translate, crop, or invent a different wordmark. Name the logo, its placement, and its size in `startScene` and `endScene`.\n- **No logo attached**: build the sting around the brand or product name from the source as title lettering in the selected text style. Do not copy typography from the visual style.\n- **Cast lock**: if a mascot blueprint is attached, it may present the logo, but it must follow the blueprint exactly. Otherwise keep the frame to the logo and a few simple shapes.\n- One calm canvas. Few elements. Lots of breathing room around the logo.\n\n## Opening architecture\n\n1. **Start still**: the logo is not yet complete — hidden behind a prop, small in the distance, drawn on halfway, or assembled from loose shapes.\n2. **One move (3–4s)**: a single reveal — draw-on, pop and settle, shapes snapping together, curtain / wipe, or a slow push-in.\n3. **End still**: the full logo, crisp and readable, centered (unless the source asks otherwise), at rest so the main video can cut in.\n\n## Audio\n\n- At most ONE short spoken line (≤ 6 English words / ≤ 10 Chinese characters) such as the brand name or tagline, or `(no dialogue)`.\n- No background music. One whoosh / pop / chime SFX synced to the reveal is encouraged.\n\n## Phase A field mapping\n\n- `clipCount`: always 1. `targetDuration`: the clip length (3–4s). `loopMode`: always linear.\n- `hookStrategy`: the reveal device in one sentence.\n- `coreMessage`: the brand promise in a few words.\n- `narrativeArc`: \"hidden → revealed → logo at rest\".\n- `visualWorld`: the canvas and the few shapes or props around the logo.\n- The single clip row: `narrativeJob` = \"opening sting\"; `startScene` / `endScene` follow the architecture above; `motionCamera` = one timed move (`0–3s …; 3–4s settle`); `englishVo` = the short line or `(no dialogue)`; `bgmSfx` = the reveal SFX.\n\n## Workflow\n\n1. Read `references/opening-proposal-contract.md` and produce Phase A in the planning language given below, the spoken line in the chosen voiceover language.\n2. Stop and request explicit approval.\n3. Only after approval, read `references/opening-prompt-contract.md` and produce the single Phase B prompt.\n\n## Output rules\n\n- Exactly one clip, 3–4 seconds.\n- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.\n- No subtitles or captions beyond the logo / title lettering.\n- End on the logo at rest; never loop.\n",
  "references": [
    {
      "path": "references/opening-prompt-contract.md",
      "content": "# Opening Clip Prompt Contract (Phase B)\n\nUse only after explicit approval of the current Phase A. Write ONE self-contained video prompt.\n\n## Prompt order\n\n1. Output spec: duration in seconds (3–4), aspect ratio, synchronized audio.\n2. Style lock: the canvas, look and negatives from the Visual style block in one sentence.\n3. Logo lock: the logo follows the START and END keyframes exactly — same shapes, colours, lettering. Never redraw or morph it into a different mark.\n4. Scene at t=0: the logo state in the START keyframe (hidden / small / forming).\n5. The one reveal move, timed across the full duration, landing on the END keyframe.\n6. Camera: still or one gentle push-in. No cuts.\n7. Audio: the short line quoted exactly once, or silence; one reveal SFX; no background music.\n8. Handoff: the logo at rest, centered, for the main video to cut in.\n9. Negatives: no extra text, no wrong spelling, no logo distortion, no style drift.\n\n## Dual-keyframe rule\n\nStart and end keyframes are the SAME SHOT. Interpolate across the full duration; never hold the start and snap to the end in the last frames.\n"
    },
    {
      "path": "references/opening-proposal-contract.md",
      "content": "# Opening Proposal Contract (Phase A)\n\nPresent a readable director's proposal and stop for confirmation before writing the model prompt.\n\n## Header contract\n\n1. Title in the reference language and in English\n2. Duration (3–4s), clip count 1, loop mode: always Linear\n3. Brand promise and the reveal device\n4. Aspect ratio, canvas, logo placement and size\n5. Spoken line (or none) and the reveal SFX\n6. Logo lock: attached logo exactly, or title lettering of the brand name\n\n## Storyboard contract\n\n| Clip # & time | Opening sting | Start still | Reveal move & settle | VO | SFX |\n|---|---|---|---|---|---|\n\nExactly ONE row.\n\n## Scene detail\n\nWrite `startScene` and `endScene` as four concrete parts, in order:\n\n1. Logo: where it is, how big, and how complete (hidden / forming / full).\n2. Set: canvas and the one or two simple shapes or props around the logo.\n3. Light: direction and mood; identical in start and end.\n4. Camera: shot size and framing; identical in start and end unless the move is a push-in.\n\n## Motion contract (`motionCamera`)\n\nOne timed move that fits 3–4 seconds, e.g. `0–3s the logo draws on stroke by stroke from left to right; 3–4s it settles with a small bounce`. Every difference between the start and end still must be caused on camera in that move. No cuts.\n\n## Phase A checks\n\n- Exactly one clip, 3–4 seconds.\n- The end still shows the full logo, readable and at rest.\n- With a logo attached, nothing redraws or invents the logo.\n- No technical colour notation.\n"
    }
  ],
  "profile": {
    "bestFor": "A short brand intro bumper that plays before your main video and introduces the brand or product name.",
    "structure": "Always a single 3–4 second clip. The length can't be changed and there is no story.",
    "hook": "One single reveal move: the logo draws on, pops in and settles, snaps together from loose shapes, is uncovered by a wipe, or the camera slowly pushes in.",
    "arc": "Logo hidden or incomplete → one reveal → full logo at rest, ready for the main video to begin.",
    "narrator": "Usually no voice; at most one very short spoken line, e.g. the brand name or a tagline. An attached mascot may present the logo.",
    "visual": "Look and palette come from the chosen visual style. A calm canvas with few elements and plenty of space around the logo. An attached logo is reproduced exactly; without one, the brand name appears as title lettering.",
    "audio": "No background music — one whoosh, pop or chime synced to the reveal.",
    "rules": "Exactly one 3–4 second clip. An attached logo is never redrawn, restyled or cropped. No subtitles beyond the logo or title, and it ends on the logo at rest without looping."
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
    "bookendRole": "opening",
    "requiresSpokenScript": false,
    "allowsRoomBackgroundUpload": false,
    "allowsOpeningPhotoUpload": false,
    "allowsBrandLogoUpload": true,
    "hiddenInPicker": false
  }
} as const;

// Hardcoded director definition for "opening-director".
export const openingDirector: IDirector = {
  _id: new ObjectId("6abe134cebdb844ee2ce5b51"),
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-01T08:01:12.058Z"),
  updatedAt: new Date("2026-10-16T07:54:15.526Z"),
};
