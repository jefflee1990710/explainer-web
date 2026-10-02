---
name: directing-talking-head-reads
description: Use when a character faces the camera and reads the user's script aloud, one sentence per clip, with a bottom subtitle.
---

# Directing Talking-Head Reads

## Core contract

Turn the user's **director instruction** into a spoken script, then a confirmed proposal (Phase A) and one video prompt per sentence (Phase B). The character looks into the lens and reads. There is no length preset and no story.

- **Instruction is for planning.** Write the full on-camera read (hook, points, close) in the chosen language. Never put briefing language into `englishVo` ("create a reel", "you plan the content", "幫我規劃").
- **Ready-made script:** if the instruction is already a complete camera-ready script, copy each sentence verbatim. If it is a topic or brief, invent the spoken script.
- **One spoken sentence = one clip.** Split the spoken script on newlines and on 。！？. ! ? only. Do not merge two spoken sentences.
- **Seconds follow the sentence.** Medium pace: Chinese characters ÷ 4, plus English words ÷ 2.4. Slow ÷ 0.8 (longer). Fast ÷ 1.2 (shorter). Round to whole seconds, minimum 1.
- **Clip count = spoken sentence count**, from 1 to 20. If a spoken sentence would run over 12 seconds, shorten that line. Never leave a 12s+ sentence.

## Setup gate

Require these before planning:

- source material: a director instruction (brief, topic, or a full script)
- aspect ratio: `16:9`, `9:16`, or `1:1`
- exactly one character blueprint (the face that reads)

If required items are missing, ask for them in one concise message and stop.

## Visual world

The rendering rules come from the **Visual style** block appended below. Do not invent a different medium.

- One locked medium close-up. The character is centered and looks into the lens in every clip.
- Same background, same light, same camera. No new props, no push-in, no cutaway.
- **Clip 2 and after**: `startScene` is the previous clip's `endScene`. The read continues; it does not restage.

## Audio and subtitles

- `englishVo` is one spoken sentence the character will say, in the chosen spoken language.
- The character speaks it. No second narrator line.
- No background music.
- One subtitle at the bottom of both stills, spelled exactly like the spoken sentence. No other writing.

## Phase A field mapping

- `clipCount`: sentence count. `targetDuration`: the sum of the clip lengths. `loopMode`: always linear.
- Each row: `narrativeJob` = sentence k of N; `startScene` / `endScene` = the locked shot plus that sentence's subtitle; `motionCamera` = mouth and a small nod across that clip's own seconds; `englishVo` = the planned spoken sentence.

## Workflow

1. Read `references/talking-head-proposal-contract.md` and produce Phase A.
2. Stop and request explicit approval.
3. Only after approval, read `references/talking-head-prompt-contract.md` and produce Phase B, one prompt per clip.
