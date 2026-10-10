---
name: directing-full-body-talking-head-reads
description: Use when a character faces the camera in a locked full-body shot and reads the user's spoken script aloud, with a similar amount of speech in each clip and a subtitle.
---

# Directing Full-Body Talking-Head Reads

## Core contract

Turn a director instruction plus a locked spoken script into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). The character looks into the lens and reads. There is no length preset and no story.

- **Instruction is for planning.** Use it for tone, emphasis, shot size, and must-have looks. Never put briefing language into `englishVo`.
- **Spoken script is locked.** Copy the words verbatim into `englishVo`. Do not rewrite or invent lines.
- **Clips share the speech.** Group short lines and split long lines so each clip has a similar word count. A period inside a token such as `Scro.io` is not a sentence break.
- **Seconds follow the words.** Medium pace: Chinese characters ÷ 4, plus English words ÷ 2.4. Slow ÷ 0.8 (longer). Fast ÷ 1.2 (shorter). Round to whole seconds. Each clip is 5–12 seconds so the voice is not sped up.
- **Clip count** is from 1 to 20. If the script would run over 240 seconds, stop and ask the user to shorten it.

## Setup gate

Require these before planning:

- source material: a director instruction
- spoken script: the words the character will read
- aspect ratio: `16:9`, `9:16`, or `1:1`
- exactly one character blueprint (the face that reads)

If required items are missing, ask for them in one concise message and stop.

## Visual world

The rendering rules (canvas, look, palette, and motion) come from the **Visual style** block appended below. Do not invent a different medium. Lettering comes only from the selected text style, never from the visual style or from this skill.

- One locked full-body shot. Head, torso, and feet stay in frame. The character is centered and looks straight into the lens in every clip, like a real person filming a reel on a phone. Do not crop to a close-up or a medium shot.
- Same background, same light, same camera. No new props, no push-in, no cutaway.
- While speaking the head, both hands, and whole body keep moving (weight shift, torso sway). Never freeze at attention.
- **Clip 2 and after**: `startScene` is the previous clip's `endScene`. The read continues; it does not restage.

## Audio and subtitles

- `englishVo` is that clip's spoken line verbatim, in the chosen spoken language.
- The character speaks it. No second narrator line.
- No background music.
- Write the subtitle into `startScene` and `endScene`. That sentence is what the still paints. A later step does not move or resize it.
- Default: `Subtitle (spell exactly): "<this clip's spoken line>"`. On a 9:16 Instagram Reel, a little below the vertical center, clear of the face and the bottom edge. On a 16:9 landscape frame, across the bottom. Use the selected text style for the lettering. Change the place or size in that sentence when the instruction asks. No other writing.

## Phase A field mapping

- `clipCount`: the balanced clip count. `targetDuration`: the sum of the clip lengths. `loopMode`: always linear.
- Each row: `narrativeJob` = clip k of N; `startScene` / `endScene` = the locked shot plus that clip's subtitle; `motionCamera` = continuous lip-sync like a reel: head tilting, both hands at chest height, weight shifting hip to hip; `englishVo` = that clip's spoken line.

## Workflow

1. Read `references/talking-head-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/talking-head-prompt-contract.md` and produce Phase B, one prompt per clip.
