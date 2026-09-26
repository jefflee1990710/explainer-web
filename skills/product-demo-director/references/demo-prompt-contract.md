# Product Demo Clip Prompt Contract (Phase B)

Use only after explicit approval of the current Phase A. Write ONE self-contained video prompt per clip.

## Prompt order

1. Output spec: duration in seconds (3–8, max 8), aspect ratio, 720p, 24 FPS, synchronized audio.
2. Style lock: repeat the canvas, look and negatives from the Visual style block in one or two sentences.
3. Product lock: repeat the exact product spec (shape, relative size, two colours, distinguishing detail). The product in the attached start/end keyframes is authoritative; never change its shape, colour, or proportion.
4. Cast lock: the presenter follows the attached keyframes and blueprints exactly; never restyle.
5. Scene at t=0: environment, product state, hand position (matches the START keyframe).
6. Timed beats scaled to duration: first half — hand approaches / begins the action with small motion; second half — the product responds and the result appears element by element, landing on the END keyframe. Name the visible result explicitly.
7. Camera: one modest move (slow push toward the product, gentle drift). No cuts inside a clip.
8. Audio: the spoken line quoted exactly once, audio-only, in the user-selected adult male or female voice; no background music; SFX synced to the product action (click, slide, chime).
9. Handoff: the product's resting state and placement the next clip inherits — or, for the last clip, the product at rest with the outcome visible; no loop.
10. Negatives: no captions/subtitles/transcribed speech, no floating UI text or price tags unless in the source, no logos beyond the simple mark in the product lock, no product shape/colour drift, no extra hands or fingers, plus the Visual style negatives.

## Dual-keyframe rule

Start and end keyframes are the SAME SHOT. Interpolate across the FULL duration; never hold the start and snap to the end in the last frames. The product keeps the same screen position and scale unless the row says a hand moves it.

## Dialogue rule

Quote the line exactly as approved, once, as audio. Forbid paraphrase, repetition, captions, or visual transcription. Keep the presenter voice identical in every prompt.

## Phase B checks

- Exactly N prompts, one per approved row, each 3–8s.
- Each prompt repeats style lock, product lock, cast lock, timed beats with a visible result, audio, handoff, negatives.
- No claim beyond the approved VO.
- Last prompt rests on the product and outcome; no bridge to Clip 1.
- No technical colour notation anywhere.
