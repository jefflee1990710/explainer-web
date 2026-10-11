---
name: directing-talking-head-reads
description: Use when a character faces the camera and reads the user's spoken script aloud, with a similar amount of speech in each clip and a subtitle.
---

# Directing Talking-Head Reads

## Core contract

Turn a director instruction plus a locked spoken script into a confirmed proposal (Phase A) and one video prompt per clip (Phase B). The character looks into the lens and reads. There is no length preset and no story.

- **Instruction is for planning.** Use it for tone, emphasis, shot size, and must-have looks. Never put briefing language into `englishVo`.
- **Spoken script is locked.** Copy the words verbatim into `englishVo`. Do not rewrite or invent lines.
- **Clips are short.** Split on sentences and clauses so each clip is about one short line (around 4 seconds of speech, never a paragraph). Group only a line that is already shorter than that. A period inside a token such as `Scro.io` is not a sentence break.
- **Seconds follow the words.** Medium pace: Chinese characters ÷ 4, plus English words ÷ 2.4. Slow ÷ 0.8 (longer). Fast ÷ 1.2 (shorter). Round to whole seconds. A short line still renders at least 5 seconds so the voice is not sped up. A clip is never longer than 12 seconds.
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

- The phone sits on a phone tripod and does not move. The lens is fixed at 24mm f/1.8: a natural phone field of view, the face sharp, the background a little soft. The character sits, centered, head and torso in frame, and looks straight into the lens. Both hands stay inside the frame. No microphone. Do not stand them up. Do not crop to a face-only close-up. Do not shoot at arm's length, and do not send an arm out of the frame.
- Same sofa, bookshelf behind the head, same ordinary window light, same locked camera. No pictures pasted on the frame, no extra writing, no microphone, no new props. No push-in, no cutaway.
- While speaking the head, shoulders, and both hands keep moving. Never freeze into a presenter statue. Never stand up.
- **Clip 2 and after**: `startScene` is the previous clip's `endScene`. The read continues; it does not restage. The camera does not jump: the end still keeps the same crop, distance, and screen position as the start still.

## Audio and subtitles

- `englishVo` is that clip's spoken line verbatim, in the chosen spoken language.
- The character speaks it. No second narrator line.
- No background music.
- Write the subtitle into `startScene` and `endScene`. That sentence is what the still paints. A later step does not move or resize it.
- Default: one LARGE phone-readable subtitle of this clip's spoken line. On a 9:16 Instagram Reel, a little below the vertical center, clear of the face and the bottom edge. On a 16:9 landscape frame, across the bottom. It fades and slides in at the start of the clip and fades and slides out at the end. Use the selected text style for the lettering. No other writing.

## Phase A field mapping

- `clipCount`: the balanced clip count. `targetDuration`: the sum of the clip lengths. `loopMode`: always linear.
- Each row: `narrativeJob` = clip k of N; `startScene` / `endScene` = the seated shot on the phone tripod, 24mm f/1.8, and that clip's subtitle; `motionCamera` = continuous lip-sync: seated, head tilting, both hands gesturing, shoulders rocking, camera locked; `englishVo` = that clip's spoken line.

## Workflow

1. Read `references/talking-head-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/talking-head-prompt-contract.md` and produce Phase B, one prompt per clip.
