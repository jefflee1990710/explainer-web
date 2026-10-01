---
name: directing-ending-stings
description: Use when making a 2–3 second ENDING brand sting (outro bumper) that closes a video — the scene resolves onto the brand logo as the final resting card in one single clip.
---

# Directing Ending Stings

## Core contract

Turn the brief into a confirmed director's proposal (Phase A) and then ONE video prompt (Phase B). An ending is exactly **one clip, 2–3 seconds long**. There is no length choice, no story, and no explainer beat: the only job is to close the video on the brand.

## Setup gate

Require these before planning:

- source material: the brand or product name, and optionally a CTA, tagline, or mood
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: the brand logo image (attached as the last reference image)
- optional: cast / character reference images (a mascot)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.

## Visual world

The rendering rules (canvas, look, palette, lettering, motion) come from the **Visual style** block appended below this skill. Do not invent a different medium.

- **Logo lock (when a logo is attached)**: the logo is the final card. Reproduce it exactly — same shapes, colours, and lettering. Never redraw, restyle, translate, crop, or invent a different wordmark. Name the logo, its placement, and its size in `startScene` and `endScene`.
- **No logo attached**: close on the brand or product name from the source as clean title lettering in the style's lettering rules.
- **Cast lock**: if a mascot blueprint is attached, it may wave goodbye or step aside for the logo, but it must follow the blueprint exactly.
- One calm canvas. Few elements. The end still is clean enough to hold as a last frame.

## Ending architecture

1. **Start still**: the closing beat — props gathering, a mascot finishing a gesture, or shapes converging toward the centre. The logo may be partly visible.
2. **One move (2–3s)**: everything resolves into the logo — gather and settle, zoom-out to the card, fade of props, or a stamp-in.
3. **End still**: the full logo centered on a calm canvas, optionally with one short CTA line if the source gives one. This is the final frame of the whole video.

## Audio

- At most ONE short spoken line (≤ 6 English words / ≤ 10 Chinese characters) such as a sign-off or CTA, or `(no dialogue)`.
- No background music. One soft resolving SFX (chime, pop, stamp) synced to the logo landing.

## Phase A field mapping

- `clipCount`: always 1. `targetDuration`: the clip length (2–3s). `loopMode`: always linear.
- `hookStrategy`: the resolve device in one sentence.
- `coreMessage`: the sign-off or CTA in a few words.
- `narrativeArc`: "closing beat → resolve → logo card at rest".
- `visualWorld`: the canvas and the few shapes or props that resolve into the logo.
- The single clip row: `narrativeJob` = "ending sting"; `startScene` / `endScene` follow the architecture above; `motionCamera` = one timed move (`0–2s …; 2–3s settle`); `englishVo` = the short line or `(no dialogue)`; `bgmSfx` = the resolve SFX.

## Workflow

1. Read `references/ending-proposal-contract.md` and produce Phase A in the planning language given below, the spoken line in the chosen voiceover language.
2. Stop and request explicit approval.
3. Only after approval, read `references/ending-prompt-contract.md` and produce the single Phase B prompt.

## Output rules

- Exactly one clip, 2–3 seconds.
- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.
- No subtitles or captions beyond the logo / title lettering and one optional CTA line.
- End on the logo card at rest; never loop back to the start.
