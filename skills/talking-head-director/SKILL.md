---
name: directing-talking-head-reads
description: Use when a character faces the camera and reads the user's script aloud, one sentence per clip, with a bottom subtitle.
---

# Directing Talking-Head Reads

## Core contract

Turn the user's script into a confirmed director's proposal (Phase A) and then one video prompt per sentence (Phase B). The character looks into the lens and reads. There is no length preset and no story.

- **One sentence = one clip.** Split on newlines and on 。！？. ! ? only. Do not merge, rewrite, or split a sentence in the middle.
- **Seconds follow the sentence.** Medium pace: Chinese characters ÷ 4, plus English words ÷ 2.4. Slow ÷ 0.8 (longer). Fast ÷ 1.2 (shorter). Round to whole seconds, minimum 1.
- **Clip count = sentence count**, from 1 to 20. If there are more than 20 sentences, stop and ask the user to cut. If one sentence would run over 12 seconds, stop and ask them to shorten that sentence. Never auto-split it.

## Setup gate

Require these before planning:

- source material: the script to be spoken
- aspect ratio: `16:9`, `9:16`, or `1:1`
- exactly one character blueprint (the face that reads)

If required items are missing, ask for them in one concise message and stop.

## Visual world

The rendering rules come from the **Visual style** block appended below. Do not invent a different medium.

- One locked medium close-up. The character is centered and looks into the lens in every clip.
- Same background, same light, same camera. No new props, no push-in, no cutaway.
- **Clip 2 and after**: `startScene` is the previous clip's `endScene`. The read continues; it does not restage.

## Audio and subtitles

- `englishVo` is that sentence verbatim, in the chosen spoken language.
- The character speaks it. No second narrator line.
- No background music.
- One subtitle at the bottom of both stills, spelled exactly like the spoken sentence. No other writing.

## Phase A field mapping

- `clipCount`: sentence count. `targetDuration`: the sum of the clip lengths. `loopMode`: always linear.
- Each row: `narrativeJob` = sentence k of N; `startScene` / `endScene` = the locked shot plus that sentence's subtitle; `motionCamera` = mouth and a small nod across that clip's own seconds; `englishVo` = the sentence.

## Workflow

1. Read `references/talking-head-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/talking-head-prompt-contract.md` and produce Phase B, one prompt per clip.
