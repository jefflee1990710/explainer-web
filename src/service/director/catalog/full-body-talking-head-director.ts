import type { IDirector } from "@/model/director";

const raw = {
  "slug": "full-body-talking-head-director",
  "title": "Full body Talking-head read",
  "description": "Frames one character head-to-toe in a locked full-body shot reading your exact script directly into the lens with expressive posture, hand gestures, and continuous frame chaining across up to 20 clips.",
  "suggestedUseCase": "Presenter-style explainers, fashion/wardrobe commentary, stage or studio announcements, fitness/posture coaching, and full-body virtual spokesperson reels.",
  "sortOrder": 10,
  "isActive": true,
  "previewUrl": "https://9he1njomuxtmv8tb.public.blob.vercel-storage.com/explainer/directors/6ac24a2e1690e9acb2fe527f-preview-c2081d61d3.webp",
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
  "systemPrompt": "---\nname: directing-full-body-talking-head-reads\ndescription: Use when a character faces the camera in a locked full-body shot and reads the user's spoken script aloud, with a similar amount of speech in each clip and a subtitle.\n---\n\n# Directing Full-Body Talking-Head Reads\n\n## Core contract\n\nTurn a director instruction plus a locked spoken script into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). The character looks into the lens and reads. There is no length preset and no story.\n\n- **Instruction is for planning.** Use it for tone, emphasis, shot size, and must-have looks. Never put briefing language into `englishVo`.\n- **Spoken script is locked.** Copy the words verbatim into `englishVo`. Do not rewrite or invent lines.\n- **Clips are short.** Split on sentences and clauses so each clip is about one short line (around 4 seconds of speech, never a paragraph). Group only a line that is already shorter than that. A period inside a token such as `Scro.io` is not a sentence break.\n- **Seconds follow the words.** Medium pace: Chinese characters ÷ 4, plus English words ÷ 2.4. Slow ÷ 0.8 (longer). Fast ÷ 1.2 (shorter). Round to whole seconds. A short line still renders at least 5 seconds so the voice is not sped up. A clip is never longer than 12 seconds.\n- **Clip count** is from 1 to 20. If the script would run over 240 seconds, stop and ask the user to shorten it.\n\n## Setup gate\n\nRequire these before planning:\n\n- source material: a director instruction\n- spoken script: the words the character will read\n- aspect ratio: `16:9`, `9:16`, or `1:1`\n- exactly one character blueprint (the face that reads)\n\nIf required items are missing, ask for them in one concise message and stop.\n\n## Visual world\n\nThe rendering rules (canvas, look, palette, and motion) come from the **Visual style** block appended below. Do not invent a different medium. Lettering comes only from the selected text style, never from the visual style or from this skill.\n\n- One locked full-body shot. Head, torso, and feet stay in frame. The character is centered and looks straight into the lens in every clip, like a real person filming a reel on a phone. Do not crop to a close-up or a medium shot.\n- Same background, same light, same camera. No new props, no push-in, no cutaway.\n- While speaking the head, eyeline, both hands, and whole body keep moving naturally: across clips, alternate distinct head angles, natural brief thinking glances aside or down at the hands before looking back into the lens, torso turns, weight shifts hip to hip, and varied hand gestures. Never freeze at attention.\n- **Clip 2 and after**: `startScene` is the previous clip's `endScene`. The read continues; it does not restage. The camera does not jump: the end still keeps the same crop, distance, and screen position as the start still.\n\n## Audio and subtitles\n\n- `englishVo` is that clip's spoken line verbatim, in the chosen spoken language.\n- The character speaks it. No second narrator line.\n- No background music.\n- Write the subtitle into `startScene` and `endScene`. That sentence is what the still paints.\n- Default: one LARGE phone-readable subtitle of this clip's spoken line. On a 9:16 Instagram Reel, a little below the vertical center, clear of the face and the bottom edge. On a 16:9 landscape frame, across the bottom. It fades and slides in at the start of the clip and fades and slides out at the end. Use the selected text style for the lettering. No other writing.\n\n## Phase A field mapping\n\n- `clipCount`: the balanced clip count. `targetDuration`: the sum of the clip lengths. `loopMode`: always linear.\n- Each row: `narrativeJob` = clip k of N; `startScene` / `endScene` = the locked shot plus that clip's subtitle; `motionCamera` = continuous lip-sync like a reel: head tilting, both hands at chest height, weight shifting hip to hip; `englishVo` = that clip's spoken line.\n\n## Workflow\n\n1. Read `references/talking-head-proposal-contract.md` and produce Phase A.\n2. Stop and request explicit approval.\n3. Only after approval, read `references/talking-head-prompt-contract.md` and produce Phase B, one prompt per clip.\n",
  "references": [
    {
      "path": "references/talking-head-prompt-contract.md",
      "content": "# Talking-Head Prompt Contract (Phase B)\n\nWrite one video prompt per approved clip. Do not start until Phase A is approved.\n\nEach prompt:\n\n1. Duration in this clip's own seconds, aspect ratio, locked full-body, the character speaking that clip's line to the lens. Head, torso, and feet stay in frame.\n2. First frame = this clip's start still. Last frame = this clip's end still. For clip 2 and after, the first frame is the previous clip's last frame.\n3. Motion: continuous lip-sync like a real person recording a reel. Eyes locked on the lens. Head tilting and nodding. Both hands gesturing at chest height. Weight shifting hip to hip. Feet stay in frame. Camera stays on the same framing from the first frame to the last: no cut, no zoom, no jump. Never freeze the face, head, hands, or body. Never a greeting wave.\n4. The subtitle is LARGE. It fades and slides in over the first 0.4s, holds still through the line, then fades and slides out over the last 0.5s. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom.\n5. No background music. No extra writing.\n"
    },
    {
      "path": "references/talking-head-proposal-contract.md",
      "content": "# Talking-Head Proposal Contract (Phase A)\n\nPresent a readable director's proposal and stop for confirmation before writing model prompts.\n\n## Script contract\n\n- The first source is a director instruction for tone and staging. It is not spoken.\n- The spoken script is locked. Copy the words into `englishVo` verbatim.\n- Never put briefing language into `englishVo`.\n- Break the spoken script into short clips. Each clip is about one clause (around 4 seconds of speech, at most 5) so the subtitle stays large. Merge only a line that is already shorter than that. Long lines split on clause breaks, then words. Do not break a token such as `Scro.io`.\n- 1–20 clips. A short line still renders at least 5 seconds. A clip is never longer than 12 seconds. A script longer than 240 seconds: ask the user to cut.\n\n## Header contract\n\n1. Title in the planning language and in English\n2. Total duration (sum of clip seconds), clip count, loop mode: always Linear\n3. The script's point in one line\n4. Aspect ratio and the locked full-body shot (eyes to lens, head to feet in frame)\n5. The character speaks. The subtitle is LARGE and phone-readable. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom. It matches each clip's spoken line, fades and slides in at the start, and fades and slides out at the end.\n6. Cast lock: the one attached blueprint\n7. No music\n\n## Storyboard contract\n\n| Clip # & time | Clip k of N | Start still | Lip-sync + head/hands/body like a reel, camera locked | Spoken line | SFX |\n|---|---|---|---|---|---|\n\nOne row per short clip. Do not pack several sentences into one row.\n\n## Scene detail\n\nWrite `startScene` and `endScene` as four concrete parts, in order:\n\n1. Character: eyes locked into the lens as if talking into a phone, mouth just opening, head tilted, one hand beginning to lift at chest height, weight on one hip (start) or mouth just closed in an engaged small smile, head tilted the other way, the other hand still raised, weight on the other hip (end). Never describe appearance.\n2. Set: the same plain background in every clip.\n3. Light: same direction and mood in every clip.\n4. Camera: locked full-body, character centered, head to feet in frame. The subtitle is LARGE (a little below center on 9:16, across the bottom on 16:9). Quote the spoken line. The end still keeps the same crop, distance, and screen position as the start still. No zoom and no jump.\n\nClip 2 and after: `startScene` copies the previous `endScene`. The end still does not reframe.\n\n## Motion contract (`motionCamera`)\n\nOne timed move that fills this clip's own seconds. The camera stays on the same framing from the first frame to the last: no cut, no zoom, no jump. Example: `0–0.4s eyes on the lens, the large subtitle fades and slides up into place; 0.4–4s continuous lip-sync, the subtitle holds large and still; 4–5s mouth closes, the large subtitle fades and slides down out; camera locked on the same framing`. Never freeze the head, hands, or body.\n\n## Phase A checks\n\n- Clip count is at most 20, and each clip is a short clause, not a paragraph.\n- Every clip is a verbatim slice of the script. Rendered length is 5–12 seconds.\n- Every clip shares the same camera, set, and light. The end still does not jump away from the start still.\n- Each start still after clip 1 matches the previous end still.\n- The subtitle is large, matches `englishVo`, fades in at the start, and fades out at the end. On 9:16 it sits a little below the vertical center. On 16:9 it sits across the bottom.\n"
    }
  ],
  "profile": {
    "bestFor": "Having one character face the camera full-length and read your own script — announcements, quick updates or presenter-style messages where the outfit and stance should stay visible.",
    "structure": "The script is split into 1 to 20 short clips, about one clause each (around 4 seconds of speech) so the subtitle stays large. A short line still plays for at least 5 seconds.",
    "hook": "No separate hook is added — the video opens straight on the character saying your first sentence, so lead with your strongest line.",
    "arc": "Follows your script sentence by sentence in order; each clip carries straight on from the previous one without restaging.",
    "narrator": "Exactly one character reads every line aloud to camera. Your script is used word for word; your separate instruction only guides tone and emphasis and is never spoken.",
    "visual": "Look and palette come from the chosen visual style. One locked full-body shot with the character centered and looking straight into the lens like a real person filming a reel; the same background, lighting and camera angle throughout. While speaking the head, both hands, and whole body keep moving (weight shift, torso sway). Feet stay in frame.",
    "audio": "No background music — just the character's voice, with a large subtitle that matches each clip's spoken line exactly. It fades and slides in at the start of the clip and fades and slides out at the end. On a 9:16 Instagram Reel the subtitle sits a little below center. On a 16:9 landscape frame it sits at the bottom.",
    "rules": "Needs a script, one character image and an aspect ratio. Words are never rewritten. Each clip is one short line so the subtitle stays large. The camera does not jump between the start still and the end still. A script over 240 seconds must be shortened."
  },
  "performance": {
    "en": {
      "restingFace": "a warm, chatty smile with a hint of teeth, eyebrows relaxed and slightly lifted, eyes locked on the lens like talking to one friend",
      "emphasisBeat": "on every stressed word or number the eyes widen, the eyebrows pop up, and the mouth opens bigger for about half a second, then the face relaxes back into the smile",
      "hookBeat": "eyebrows already lifting into a big warm smile",
      "ctaBeat": "a softer, closer smile, eyebrows settling, the torso leaning a little toward the lens like sharing a secret",
      "gestureLibrary": "a raised index finger or a small finger count on a list or a number, an open palm pushed out toward the lens on 'look at this', a two-handed open-palm shrug, a hand touching the chest or chin in thought, a palm facing the lens swaying side to side on a negative, fingers spread beside the face on a big claim, a palm turned up and offered to the lens on an invitation",
      "headMotion": "a constant small side-to-side sway of a few degrees, distinct head turns and tilts left and right, brief thoughtful glances slightly off-camera or down at the hands before looking back into the lens, nods on stressed words, a chin drop then lift, leaning forward toward the lens on a key point then settling back or shifting seated weight slightly left and right on the sofa; shoulders rock",
      "anchorProp": "",
      "set": "the same plain background in every clip, no new props",
      "light": "ordinary daylight from a window to one side, unchanged"
    },
    "yue": {
      "restingFace": "露少少牙嘅親切笑容，眉毛放鬆微微揚起，直望鏡頭好似同一個朋友傾偈",
      "emphasisBeat": "每到重音字或者數字，眼睛睜大、眉毛快速上挑、口張大約半秒，然後放鬆返落笑容",
      "hookBeat": "眉毛已經揚起、展開一個大笑容",
      "ctaBeat": "更柔和、更親近嘅淺笑，眉毛放鬆，上身微微傾向鏡頭好似講緊秘密",
      "gestureLibrary": "數數或者講數字時豎食指、「睇呢個」時掌心向鏡頭推出、雙手攤開聳肩、思考時手指輕觸下巴或心口、否定時掌心對鏡頭左右擺、誇張強調時五指張開喺臉旁、邀請時掌心向上遞向鏡頭",
      "headMotion": "全程有幾度嘅細幅左右搖擺，頭部明顯左右轉向同傾斜、思考時眼神短暫望向側邊或者望一望雙手再望返鏡頭、重音位點頭、下巴跌一跌再抬起，講到重點時上身明顯前傾靠近鏡頭、再坐返後或者喺沙發微移重心；膊頭自然郁動",
      "anchorProp": "",
      "set": "全程同一個簡潔背景，冇新道具",
      "light": "一邊窗嘅自然日光，不變"
    }
  },
  "behavior": {
    "keyframeMode": "end-is-next-start",
    "chainsClipStarts": true,
    "anchorsFramesToFirstClip": true,
    "dualBeat": false,
    "maxBackgroundSets": 1,
    "speechMode": "lip-sync",
    "bansNarration": false,
    "requiredCastCount": 1,
    "talkingHeadShot": "full-body",
    "selfShotCreatorCamera": true,
    "forcesSceneText": false,
    "allowsInWorldLabels": false,
    "attachesTextStyleReference": true,
    "requiresSpokenScript": true,
    "allowsRoomBackgroundUpload": false,
    "allowsOpeningPhotoUpload": false,
    "allowsBrandLogoUpload": false,
    "maxStyleCount": 1,
    "hiddenInPicker": true
  }
} as const;

// Hardcoded director definition for "full-body-talking-head-director".
export const fullBodyTalkingHeadDirector: IDirector = {
  _id: "6ac513958eb5511915a474a5",
  ...raw,
  inputSchema: {
    ...raw.inputSchema,
    aspectRatios: [...raw.inputSchema.aspectRatios],
    durationPresets: [...raw.inputSchema.durationPresets],
  },
  references: raw.references.map((ref) => ({ ...ref })),
  createdAt: new Date("2026-10-06T15:28:19.380Z"),
  updatedAt: new Date("2026-10-16T16:42:36.785Z"),
};
