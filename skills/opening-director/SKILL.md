---
name: directing-opening-stings
description: Use when making a 2–3 second OPENING brand sting (intro bumper) that plays before a main video — the brand logo arrives and settles in one single clip.
---

# Directing Opening Stings

## Core contract

Turn the brief into a confirmed director's proposal (Phase A) and then ONE video prompt (Phase B). An opening is exactly **one clip, 2–3 seconds long**. There is no length choice, no story, and no explainer beat: the only job is to introduce the brand before the main video starts.

## Setup gate

Require these before planning:

- source material: the brand or product name, and optionally a tagline or mood
- aspect ratio: `16:9`, `9:16`, or `1:1`
- optional: the brand logo image (attached as the last reference image)
- optional: cast / character reference images (a mascot)

If required items are missing, ask for them in one concise message and stop. Never select an aspect ratio silently. Do not re-ask choices already supplied.

## Visual world

The rendering rules (canvas, look, palette, lettering, motion) come from the **Visual style** block appended below this skill. Do not invent a different medium.

- **Logo lock (when a logo is attached)**: the logo is the hero of the sting. Reproduce it exactly — same shapes, colours, and lettering. Never redraw, restyle, translate, crop, or invent a different wordmark. Name the logo, its placement, and its size in `startScene` and `endScene`.
- **No logo attached**: build the sting around the brand or product name from the source as clean title lettering in the style's lettering rules.
- **Cast lock**: if a mascot blueprint is attached, it may present the logo, but it must follow the blueprint exactly. Otherwise keep the frame to the logo and a few simple shapes.
- One calm canvas. Few elements. Lots of breathing room around the logo.

## Opening architecture

1. **Start still**: the logo is not yet complete — hidden behind a prop, small in the distance, drawn on halfway, or assembled from loose shapes.
2. **One move (2–3s)**: a single reveal — draw-on, pop and settle, shapes snapping together, curtain / wipe, or a slow push-in.
3. **End still**: the full logo, crisp and readable, centered (unless the source asks otherwise), at rest so the main video can cut in.

## Audio

- At most ONE short spoken line (≤ 6 English words / ≤ 10 Chinese characters) such as the brand name or tagline, or `(no dialogue)`.
- No background music. One whoosh / pop / chime SFX synced to the reveal is encouraged.

## Phase A field mapping

- `clipCount`: always 1. `targetDuration`: the clip length (2–3s). `loopMode`: always linear.
- `hookStrategy`: the reveal device in one sentence.
- `coreMessage`: the brand promise in a few words.
- `narrativeArc`: "hidden → revealed → logo at rest".
- `visualWorld`: the canvas and the few shapes or props around the logo.
- The single clip row: `narrativeJob` = "opening sting"; `startScene` / `endScene` follow the architecture above; `motionCamera` = one timed move (`0–2s …; 2–3s settle`); `englishVo` = the short line or `(no dialogue)`; `bgmSfx` = the reveal SFX.

## Workflow

1. Read `references/opening-proposal-contract.md` and produce Phase A in the planning language given below, the spoken line in the chosen voiceover language.
2. Stop and request explicit approval.
3. Only after approval, read `references/opening-prompt-contract.md` and produce the single Phase B prompt.

## Output rules

- Exactly one clip, 2–3 seconds.
- Colours in ordinary words only; never hexadecimal, RGB, HSL, or Pantone.
- No subtitles or captions beyond the logo / title lettering.
- End on the logo at rest; never loop.
